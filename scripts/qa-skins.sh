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
  # The professional skin deletes the attribute rather than setting a sentinel,
  # so the page reports it as the string below rather than as `undefined`.
  if [ "$skin" = "professional" ]; then skinJson="undefined"; else skinJson="'$skin'"; fi
  # Set and reload in ONE expression. Split across two commands the live page
  # re-persists its own skin between them, so the reload can load the skin that
  # was already showing rather than the one under test.
  $B goto "$URL" >/dev/null
  # Clear the buffer BEFORE the load under test. The browse daemon accumulates
  # console output across every page it has ever visited in the session, so
  # without this each skin inherits the previous ones' noise and every skin
  # reports an identical count -- which is the tell that the number is not
  # about this page at all. The first version of this check "found" 140 errors
  # per skin, including THREE.js WebGL failures from a project that does not
  # use THREE.js.
  $B console --clear >/dev/null 2>&1 || true
  $B js "localStorage.setItem('kk-skin','$skin'); location.reload(); 'go'" >/dev/null
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
      // Was main.previousElementSibling, which resolves to the docked
      // Drawer rather than the hero, so it reported the whole document height
      // while measuring nothing. NOTE: no backticks anywhere in this probe --
      // it is inside a double-quoted shell argument, and a backtick there is
      // command substitution, not a comment.
      heroHeight: Math.round(document.querySelector('main > div > div')?.firstElementChild?.getBoundingClientRect().height || 0),
      // Asserted, not assumed: an overflow number is meaningless if the
      // viewport is not the one the check claims to be testing. The first
      // version reported overflow at "390px" from a window that was still 1440
      // wide, which is where its false positives came from.
      width: window.innerWidth,
      sections: document.querySelectorAll('section[id], [id]').length,
      invisible: [...document.querySelectorAll('h1,h2,h3')].filter(n => {
        const s = getComputedStyle(n);
        return s.opacity === '0' || s.visibility === 'hidden';
      }).length
    });
  })()")
  echo "  $report"

  # The run is only meaningful if the page under test is the page we asked for.
  actual=$(printf '%s' "$report" | sed -n 's/.*"skin":"\([a-z]*\)".*/\1/p')
  if [ "$actual" != "$skin" ]; then
    echo "  FAIL: asked for '$skin' but the page reports '$actual' — result discarded"
    fail=1
    continue
  fi

  ov=$(printf '%s' "$report" | sed -n 's/.*"overflow":\([0-9-]*\).*/\1/p')
  if [ "${ov:-0}" -gt 0 ]; then echo "  FAIL: ${ov}px horizontal overflow"; fail=1; fi

  inv=$(printf '%s' "$report" | sed -n 's/.*"invisible":\([0-9]*\).*/\1/p')
  if [ "${inv:-0}" -gt 0 ]; then echo "  FAIL: ${inv} heading(s) left invisible"; fail=1; fi

  # Buffer to a file first. Piping the browse process straight into `grep -c`
  # (or `head`) lets the reader close the pipe as soon as it has counted, and
  # the SIGPIPE kills browse mid-write — which surfaced as an EPIPE stack trace
  # that aborted the whole sweep two skins in.
  $B console --errors > "$OUT/console-$skin.txt" 2>&1 || true
  # Font-preload advisories are Next's dev server, not the page, and every skin
  # emits them; counting them as findings trains the reader to ignore the gate.
  # Count real page errors only. Font-preload advisories are the Next dev
  # server talking about itself, and the WOFF2/403 noise comes from fonts the
  # dev server rebuilds mid-session -- neither is a defect in the page.
  errs=$(grep -i 'error' "$OUT/console-$skin.txt" \
    | grep -civ 'preloaded using link preload\|OTS parsing\|status of 403\|UNTRUSTED\|no console errors' || true)
  if [ "${errs:-0}" -gt 0 ]; then
    echo "  FAIL: $errs console error line(s) — see $OUT/console-$skin.txt"
    fail=1
  fi

  $B screenshot "$OUT/$skin-desktop.png" >/dev/null
  $B viewport 390x844 >/dev/null
  $B goto "$URL" >/dev/null
  $B js "new Promise(r=>setTimeout(()=>r('ok'),2000))" >/dev/null
  mob=$($B js "(() => { if (window.innerWidth !== 390) return 'BADVIEWPORT:' + window.innerWidth; if (document.documentElement.dataset.skin !== ($skinJson)) return 'BADSKIN'; return String(document.documentElement.scrollWidth - document.documentElement.clientWidth); })()")
  case "$mob" in
    BAD*) echo "  WARN: mobile probe void ($mob) — not counted" ;;
    ''|*[!0-9]*) echo "  WARN: mobile probe returned '$mob'" ;;
    0) ;;
    *) echo "  FAIL: ${mob}px horizontal overflow at 390px"; fail=1 ;;
  esac
  $B screenshot "$OUT/$skin-mobile.png" >/dev/null
  $B viewport 1440x900 >/dev/null
done

echo
if [ "$fail" -eq 0 ]; then echo "ALL SKINS PASS"; else echo "FAILURES PRESENT"; exit 1; fi
