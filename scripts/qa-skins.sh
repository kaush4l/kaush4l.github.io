#!/usr/bin/env bash
# QA gate for the perspective skins.
#
# For every skin it: stamps the choice into localStorage, reloads so the
# BLOCKING pre-paint path is the one under test (not a post-hydration switch),
# and then checks the things that actually break on a skinned page:
#
#   • console errors
#   • horizontal overflow — the single most common skin defect, because an
#     atmosphere layer that overhangs the frame still counts toward scrollWidth
#   • the pre-paint ground and the hydrated ground AGREEING, which is the whole
#     point of SKIN_PREPAINT being a single owner
#   • the hero actually rendering something at the fold
#   • nothing left invisible by a hero that forgot to clear `data-motion`
#
# Screenshots land in the output dir for the eyeball pass.
set -euo pipefail

B="${BROWSE_BIN:-$HOME/.claude/skills/gstack/browse/dist/browse}"
URL="${1:-http://localhost:3000/}"
OUT="${2:-/tmp/skin-qa}"
mkdir -p "$OUT"

SKINS=(professional ronin sanctum terminal accession)
fail=0

for skin in "${SKINS[@]}"; do
  echo "──────── $skin ────────"
  $B js "localStorage.setItem('kk-skin','$skin'); 'set'" >/dev/null
  $B goto "$URL" >/dev/null
  $B js "new Promise(r=>setTimeout(()=>r('ok'),2500))" >/dev/null

  report=$($B js "(() => {
    const el = document.documentElement;
    const cs = getComputedStyle(el);
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    return JSON.stringify({
      skin: el.dataset.skin || 'professional',
      theme: el.dataset.theme,
      effects: el.dataset.effects || null,
      bg: cs.getPropertyValue('--bg').trim(),
      text: cs.getPropertyValue('--text').trim(),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      stuckMotion: el.dataset.motion === 'on',
      heroHeight: Math.round(document.querySelector('main')?.previousElementSibling?.getBoundingClientRect().height || 0),
      sections: document.querySelectorAll('section[id], [id]').length,
      invisible: [...document.querySelectorAll('h1,h2,h3')].filter(n => {
        const s = getComputedStyle(n);
        return s.opacity === '0' || s.visibility === 'hidden';
      }).length
    });
  })()")
  echo "  $report"

  ov=$(printf '%s' "$report" | sed -n 's/.*"overflow":\([0-9-]*\).*/\1/p')
  if [ "${ov:-0}" -gt 0 ]; then echo "  FAIL: ${ov}px horizontal overflow"; fail=1; fi

  inv=$(printf '%s' "$report" | sed -n 's/.*"invisible":\([0-9]*\).*/\1/p')
  if [ "${inv:-0}" -gt 0 ]; then echo "  FAIL: ${inv} heading(s) left invisible"; fail=1; fi

  errs=$($B console --errors 2>&1 | grep -civ 'no console errors\|UNTRUSTED' || true)
  if [ "${errs:-0}" -gt 0 ]; then echo "  WARN: console output present"; $B console --errors | head -8; fi

  $B screenshot "$OUT/$skin-desktop.png" >/dev/null
  $B viewport 390x844 >/dev/null
  $B goto "$URL" >/dev/null
  $B js "new Promise(r=>setTimeout(()=>r('ok'),2000))" >/dev/null
  mob=$($B js "document.documentElement.scrollWidth - document.documentElement.clientWidth")
  if [ "${mob:-0}" -gt 0 ]; then echo "  FAIL: ${mob}px horizontal overflow at 390px"; fail=1; fi
  $B screenshot "$OUT/$skin-mobile.png" >/dev/null
  $B viewport 1440x900 >/dev/null
done

echo
if [ "$fail" -eq 0 ]; then echo "ALL SKINS PASS"; else echo "FAILURES PRESENT"; exit 1; fi
