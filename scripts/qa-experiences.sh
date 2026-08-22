#!/usr/bin/env bash
# QA gate for the experience routes.
#
# `qa-skins.sh` is NOT extended. It gates a different surface, it is currently
# green, and coupling the two means an experience defect turns the skin gate
# red — which trains the reader to ignore both. Same daemon, same discipline,
# two exit codes.
#
# ── THE ONE THING THAT MAKES THIS GATE DIFFERENT ────────────────────────────
# There is no `EXPERIENCES=(…)` array in this file, and there must never be one.
# The worlds are enumerated from the RENDERED DASHBOARD — the `data-experience-id`
# stamps the dashboard puts on one element per `EXPERIENCE_LIST` entry. That is
# strictly stronger than a bash array *or* a generated manifest, because it
# additionally catches "the world is in the array but its card does not render",
# a failure class an array can never catch: an array agrees with itself.
#
# The price of enumerating from the page is that an empty list is indistinguish-
# able from a clean sweep, so an empty list is a LOUD failure here. The lesson
# is `qa-skins.sh`'s "asked for X, page reports Y — result discarded" guard: a
# gate that silently tests nothing is worse than no gate, because it reports
# green.
#
# ── SERIALISATION ───────────────────────────────────────────────────────────
# The browse daemon is a single shared browser. Two QA runs in parallel — or one
# run that fans out — interleave navigations and console buffers, and every
# assertion below then describes a page that no longer exists. Every browser
# interaction in this script is sequential, exactly as `qa-skins.sh` is, and
# nothing here may be backgrounded.
#
# Usage:  bash scripts/qa-experiences.sh [base-url] [out-dir]
#         XP_QA_SKIP_SKINS=1  skip the D5 sub-gate (slow; run it before landing)
set -euo pipefail

B="${BROWSE_BIN:-$HOME/.claude/skills/gstack/browse/dist/browse}"
# The BASE, with no trailing slash — every URL below is built from it, so a
# caller pointing at a preview deploy changes one argument and nothing else.
URL="${1:-http://localhost:3000}"
URL="${URL%/}"
OUT="${2:-/tmp/experience-qa}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$OUT"

# `fail` is a real defect in the code under test. `pending` is a gate that could
# not run because something it measures has not been built yet. Both exit
# non-zero — a gate that cannot measure must not report green — but they print
# different summaries, so nobody spends an afternoon hunting a bug in a world
# when the actual answer is "that stamp does not exist yet".
fail=0
pending=0
PENDING_NOTES=""

note_pending() {
    pending=1
    PENDING_NOTES="${PENDING_NOTES}  • $1
"
}

# ── Small helpers ───────────────────────────────────────────────────────────
# Extraction is sed over the probe's JSON rather than jq: `qa-skins.sh` sets the
# idiom and jq is not a declared dependency of this repo. Keys are unique within
# each probe, so sed's greedy `.*` cannot pick the wrong one.
num() { printf '%s' "$2" | sed -n "s/.*\"$1\":\([0-9-]*\).*/\1/p"; }
str() { printf '%s' "$2" | sed -n "s/.*\"$1\":\"\([^\"]*\)\".*/\1/p"; }

# The distinct words of a space-separated list, in one word per space, empties
# dropped. `sed '/^$/d'` rather than `grep -v '^$'` on purpose: this script runs
# under `pipefail`, and a `grep` that matches nothing exits 1, which kills the
# whole run at the exact moment the list under inspection is empty — i.e. the
# moment the gate most needs to report what it found. sed always exits 0.
uniq_words() { printf '%s' "$1" | tr ' ' '\n' | sed '/^$/d' | sort -u | tr '\n' ' '; }

# 2.4s, matching the skin gate's dwell. Long enough for hydration, the tier
# effect and the token write; short enough that five worlds times three
# viewports is still a coffee, not a lunch.
settle() { $B js "new Promise(r=>setTimeout(()=>r('ok'),2400))" >/dev/null; }

# The console buffer accumulates across every page the daemon has ever visited
# in the session. Without a clear before the load under test, each world
# inherits every earlier world's noise and they all report an identical count —
# which is the tell that the number is not about this page at all.
clear_console() { $B console --errors >/dev/null 2>&1 || true; $B console --clear >/dev/null 2>&1 || true; }

# Real page errors only. Font-preload advisories are the Next dev server talking
# about itself; the OTS/403 WOFF2 noise comes from faces the dev server rebuilds
# mid-session. Neither is a defect in the page, and counting them as findings
# trains the reader to ignore the gate. Filter list kept identical to
# `qa-skins.sh` on purpose — two gates disagreeing about what counts as an error
# is how a real one gets waved through.
#
# ONE entry is not in `qa-skins.sh`, and it is here with its proof rather than on
# trust: React's "Encountered a script tag while rendering React component",
# which `/experience/<id>/` raises on a CLIENT-SIDE navigation because the
# segment layout renders the pre-paint `<script>` and React declines to execute
# scripts it renders on the client. It is DEV-ONLY, and that was established by
# running the identical navigation against the built export rather than by
# reading the React source:
#
#   python3 -m http.server 4321 --directory out
#   click through /experience/ -> /experience/trunk/ and read the console
#     dev  (next dev, :3000) -> the error is present
#     prod (static export, :4321) -> console is clean
#
# and the script's WORK was verified on that same production navigation, so this
# filters noise rather than hiding a broken pre-paint:
#   after client-side nav : {"exp":"trunk","bg":"#0A0D0C","beats":24}
#   after a hard load     : {"exp":"trunk","bg":"#0A0D0C","beats":24}
#   back on /             : {"exp":null,"style":null,"bg":"rgb(250, 250, 250)"}
#
# If this gate is ever pointed at a production server, DELETE this entry — there
# the same line would be a real finding.
check_console() {
    local label="$1" file="$OUT/console-$1.txt" errs
    $B console --errors > "$file" 2>&1 || true
    errs=$(grep -i 'error' "$file" \
        | grep -civ 'preloaded using link preload\|OTS parsing\|status of 403\|UNTRUSTED\|no console errors\|Encountered a script tag while rendering React component' || true)
    if [ "${errs:-0}" -gt 0 ]; then
        echo "    FAIL: ${errs} console error line(s) — see $file"
        fail=1
    fi
}

# The default route's fingerprint. Everything this feature is forbidden from
# touching, in one string, so a leak is a diff rather than a judgement call.
DEFAULT_PROBE="(() => {
  const cs = getComputedStyle(document.documentElement);
  return JSON.stringify({
    bg: cs.getPropertyValue('--bg').trim(),
    text: cs.getPropertyValue('--text').trim(),
    primary: cs.getPropertyValue('--primary').trim(),
    bodyStyle: document.body.getAttribute('style'),
    experience: document.body.dataset.experience || null,
    htmlKeys: Object.keys(document.documentElement.dataset).sort().join(','),
  });
})()"

# ═════════════════════════════════════════════════════════════════════════════
# E.3 — THE DEFAULT-ROUTE REGRESSION GATE, PART ONE
#
# Run FIRST, before any experience has been visited, so the values captured here
# are the untouched ones. Part two re-runs it at the end of the sweep from a
# browser that has been through every world, and diffs. That pairing is what
# turns D2–D4 from "these look plausible" into "this feature changed nothing",
# which is the only form of the assertion worth having.
# ═════════════════════════════════════════════════════════════════════════════
echo "════════ E.3 default route — before ════════"
$B viewport 1440x900 >/dev/null
clear_console
$B goto "$URL/" >/dev/null
settle
# The daemon is long-lived and its localStorage outlives a run — including the
# `kk-skin` a previous invocation of `qa-skins.sh` left behind. A baseline
# captured on top of somebody else's stored skin is a baseline of a different
# page, so the run starts from a first-time visitor: every key this site owns
# removed, then a reload so the BLOCKING pre-paint path resolves them afresh
# rather than the live page re-persisting what it is already showing.
$B js "['kk-skin','kk-appearance','kk-theme-variant','kk-color-mode','kk-reduce-motion']
  .forEach(k => localStorage.removeItem(k)); location.reload(); 'go'" >/dev/null
settle
BASE_BEFORE=$($B js "$DEFAULT_PROBE")
echo "  $BASE_BEFORE"

# D1 — no experience stamp survives onto the résumé.
if [ "$(str experience "$BASE_BEFORE")" != "" ]; then
    echo "  FAIL D1: / carries body[data-experience]"; fail=1
fi
# D2 — `--xp-*` never reaches `/`. The whole feature writes to `body.style` and
# `clearExperienceTokens` removes every key, so the honest bar is not "no --xp-*
# key" but "no inline style attribute at all", which is what a visitor who never
# opened the feature has.
if ! printf '%s' "$BASE_BEFORE" | grep -q '"bodyStyle":null'; then
    echo "  FAIL D2: / has an inline body style — $(printf '%s' "$BASE_BEFORE" | sed -n 's/.*"bodyStyle":\("[^"]*"\).*/\1/p')"
    fail=1
fi

# D3 — the ground tokens against a baseline captured on `main` BEFORE this
# feature. That file cannot be produced by this script: it would be capturing
# the working tree and calling it the baseline, which is a tautology, not a
# gate. So it is compared when present and its absence is stated out loud rather
# than passed over.
BASELINE="$OUT/default-route-baseline.json"
if [ -f "$BASELINE" ]; then
    for key in bg text primary; do
        want=$(str "$key" "$(cat "$BASELINE")")
        got=$(str "$key" "$BASE_BEFORE")
        if [ "$want" != "$got" ]; then
            echo "  FAIL D3: --$key is '$got', baseline says '$want'"; fail=1
        fi
    done
    echo "  D3 compared against $BASELINE"
else
    echo "  D3 NOT COMPARED — no baseline at $BASELINE."
    echo "       Generate it once from a checkout of main, before this feature:"
    echo "       git stash && bash scripts/qa-experiences.sh '$URL' '$OUT' ; # copy the"
    echo "       'E.3 default route — before' JSON line into that file, then git stash pop."
fi

check_console "default-before"

# ═════════════════════════════════════════════════════════════════════════════
# E.1 — ENUMERATION FROM THE RENDERED DASHBOARD
# ═════════════════════════════════════════════════════════════════════════════
echo
echo "════════ E.1 enumeration ════════"
clear_console
$B goto "$URL/experience/" >/dev/null
settle
IDS=$($B js "[...document.querySelectorAll('[data-experience-id]')].map(n => n.dataset.experienceId).join(' ')")
# The daemon prints the expression's value; a page with no stamps yields an
# empty string, and so does a page that failed to load. Both are the same
# failure from this gate's point of view: it measured nothing.
IDS=$(printf '%s' "$IDS" | tr -d '\r')
if [ -z "${IDS// /}" ]; then
    echo "  FAIL: the dashboard at $URL/experience/ stamped NO data-experience-id."
    echo "        Either EXPERIENCE_LIST is empty, the dashboard did not render, or"
    echo "        the stamp was dropped. This gate enumerates from that stamp, so"
    echo "        continuing would report a vacuous pass over zero worlds."
    exit 1
fi
# shellcheck disable=SC2206
ID_ARRAY=($IDS)
echo "  ${#ID_ARRAY[@]} world(s) enumerated from the page: $IDS"
check_console "dashboard"

# The dashboard is a browsing surface at 390 too (X9's acceptance), so it is
# swept for overflow before the worlds are.
$B viewport 390x844 >/dev/null
$B goto "$URL/experience/" >/dev/null
settle
dash=$($B js "(() => JSON.stringify({
  w: window.innerWidth,
  od: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  cards: document.querySelectorAll('[data-experience-id]').length,
}))()")
echo "  dashboard@390: $dash"
if [ "$(num w "$dash")" != "390" ]; then
    echo "    WARN: viewport probe void (reports $(num w "$dash")px) — not counted"
elif [ "$(num od "$dash")" -gt 0 ]; then
    echo "    FAIL: dashboard has $(num od "$dash")px horizontal overflow at 390"; fail=1
fi
$B screenshot "$OUT/dashboard-390.png" >/dev/null
$B viewport 1440x900 >/dev/null

# ═════════════════════════════════════════════════════════════════════════════
# E.2 — PER WORLD, AT EACH OF THE FOUR VIEWPORTS
#
#  390×844   a phone, portrait            → compact telling
#  820×1180  a tablet, portrait           → compact telling  (see below)
# 1024×1180  a tablet, landscape / small  → MEDIUM telling
# 1440×900   a laptop                     → cinema telling
#
# ── Why 820 is a `compact` row and why a fourth viewport had to be added ─────
# This loop used to read `820x1180:820:medium`, and that expectation was simply
# wrong. `useViewport` resolves `medium` from MUI's `up('md')`, and MUI's `md`
# is 900 — so 820 is BELOW it and correctly reports `compact`. The label was
# never asserted, only printed, so the gate did not fail; it just told every
# reader for the length of the project that the tablet row was exercising the
# middle telling when it was exercising the phone one a second time.
#
# The consequence was worse than a wrong word. With only 390/820/1440 in the
# list, NO row in this file ever rendered `medium`, and A7 — "the tier actually
# changed" — passed on `compact`≠`cinema` while the third telling went
# unmeasured from the day it was written. A6's identical beat count was then a
# claim about two tellings being sold as a claim about three, which is this
# file's own "reports green having tested nothing" failure.
#
# So 820 keeps its row — it is a real device width and it caught real overflow
# (QA-2026-08-22: 48px in `trunk`, 52px in `overworld`, 20px in `crossing`) —
# and it is labelled with the tier it actually produces. 1024 is added beside
# it as the narrowest width that is genuinely `medium`: ≥900 and <1200, i.e.
# strictly inside the band, not on either edge where a rounding difference in
# the daemon's window sizing could tip it into a neighbouring telling.
# ═════════════════════════════════════════════════════════════════════════════

# The story is one story. Every world tells the SAME résumé, so the beat count
# is a cross-world invariant as well as a cross-viewport one: the first count
# observed becomes the reference and every later count is measured against it.
# Deriving the reference from the sweep rather than hardcoding it means adding a
# résumé entry never edits this file.
REF_BEATS=""

# The per-viewport probe. NOTE: no backticks anywhere — this is inside a
# double-quoted shell argument, where a backtick is command substitution rather
# than a template literal.
probe_js() {
    echo "(() => {
      const el = document.documentElement;
      const doorLink = document.querySelector('nav[aria-label=\"Leave this experience\"] a');
      const doorRect = doorLink ? doorLink.getBoundingClientRect() : null;
      return JSON.stringify({
        experience: document.body.dataset.experience || '',
        // The tier is stamped on the STAGE element, not on \`body\`. That is the
        // implementation's choice and it is the right one: \`applyExperienceTokens\`
        // is the single owner of every write to \`body\` (M32), so a second writer
        // racing it for a data attribute is the bug that discipline exists to
        // prevent. The gate reads where the contract actually lives; \`body\` stays
        // in the chain only so a world that does stamp it there still measures.
        tier: (document.querySelector('[data-xp-stage]') || document.body).dataset.tier || '',
        width: window.innerWidth,
        overflowDoc: el.scrollWidth - el.clientWidth,
        overflowBody: document.body.scrollWidth - document.body.clientWidth,
        invisible: [...document.querySelectorAll('h1,h2,h3')].filter(n => {
          const s = getComputedStyle(n);
          return s.opacity === '0' || s.visibility === 'hidden' || s.display === 'none';
        }).length,
        beats: document.querySelectorAll('[data-beat-id]').length,
        rendered: document.querySelectorAll('.xp-beat, [data-beat-id]').length,
        doorHref: doorLink ? doorLink.getAttribute('href') : '',
        doorW: doorRect ? Math.round(doorRect.width) : 0,
        doorH: doorRect ? Math.round(doorRect.height) : 0,
        beatsInsideNoPrint: [...document.querySelectorAll('.xp-beat, [data-beat-id]')]
          .filter(n => n.closest('.no-print')).length,
        noPrintChrome: document.querySelectorAll('.no-print').length,
      });
    })()"
}

for id in "${ID_ARRAY[@]}"; do
    echo
    echo "════════ $id ════════"
    tier_seen=""
    beats_seen=""

    for spec in 390x844:390:compact 820x1180:820:compact 1024x1180:1024:medium 1440x900:1440:cinema; do
        vp="${spec%%:*}"; rest="${spec#*:}"; expw="${rest%%:*}"; want_tier="${rest##*:}"
        echo "  ── ${vp} (expects '${want_tier}') ──"

        # A11 (deep link, cold): every viewport pass is a FRESH `goto` straight
        # at the world's own URL, never a click through from the dashboard. So
        # the cold-deep-link assertion is not a separate section that could rot —
        # it is the only way this loop ever reaches a world.
        $B viewport "$vp" >/dev/null
        clear_console
        $B goto "$URL/experience/$id/" >/dev/null
        settle

        report=$($B js "$(probe_js)")
        echo "    $report"

        # A2 — the viewport is the one this row claims. An overflow number from
        # the wrong width is not a weaker result, it is a different measurement
        # wearing this one's label, so the row is voided rather than counted.
        if [ "$(num width "$report")" != "$expw" ]; then
            echo "    WARN: probe void — window is $(num width "$report")px, not ${expw}px"
            continue
        fi

        # A2b — the TIER this row claims, ASSERTED rather than printed. The
        # `expects '…'` in the heading above was decoration for the length of
        # this project and it hid a wrong expectation in plain sight (see the
        # section header). A row that renders a different telling from the one
        # it is labelled with is not a softer result either: it means A6 and A7
        # are describing a set of tellings that was never rendered.
        got_tier=$(str tier "$report")
        if [ -n "$got_tier" ] && [ "$got_tier" != "$want_tier" ]; then
            echo "    FAIL: ${expw}px renders tier '$got_tier', this row claims '$want_tier'."
            echo "          Either useViewport's ladder moved or this list is stale — one of"
            echo "          the two is wrong and the beat-count assertions below depend on it."
            fail=1
        fi

        # A1 — the page is the world we asked for.
        actual=$(str experience "$report")
        if [ "$actual" != "$id" ]; then
            echo "    FAIL: asked for '$id', page reports '${actual:-<none>}' — result discarded"
            fail=1
            continue
        fi

        # A3 — horizontal overflow, on BOTH boxes. `documentElement` alone misses
        # an overhanging fixed layer that only widens `body`, which is exactly
        # what an atmosphere layer does.
        od=$(num overflowDoc "$report"); ob=$(num overflowBody "$report")
        [ "${od:-0}" -gt 0 ] && { echo "    FAIL: ${od}px horizontal overflow (documentElement)"; fail=1; }
        [ "${ob:-0}" -gt 0 ] && { echo "    FAIL: ${ob}px horizontal overflow (body)"; fail=1; }

        # A4 — nothing left invisible by a stage that forgot to clear its
        # entrance state. `display:none` counts here too: a heading that is not
        # in the box tree is not a shorter telling, it is a missing one.
        inv=$(num invisible "$report")
        [ "${inv:-0}" -gt 0 ] && { echo "    FAIL: ${inv} heading(s) invisible"; fail=1; }

        # A5 — console.
        check_console "$id-$expw"

        # A6 — the story is RETOLD, not hidden. Collected here, compared after
        # all three viewports, because the assertion is about the set.
        beats_seen="$beats_seen $(num beats "$report")"
        tier_seen="$tier_seen $(str tier "$report")"

        # A12 — the escape hatch. First tab stop, real link to `/`, and a target
        # a thumb can hit. Pressed rather than inferred: "it is first in the DOM"
        # is the intent, "Tab lands on it" is the property.
        $B js "document.activeElement && document.activeElement.blur(); 'ok'" >/dev/null
        $B press Tab >/dev/null 2>&1 || true
        focused=$($B js "(() => {
          const a = document.activeElement;
          if (!a || a === document.body) return JSON.stringify({tag:'NONE',href:'',w:0,h:0});
          const r = a.getBoundingClientRect();
          return JSON.stringify({tag:a.tagName,href:a.getAttribute('href')||'',w:Math.round(r.width),h:Math.round(r.height)});
        })()")
        fhref=$(str href "$focused")
        fh=$(num h "$focused")
        fw=$(num w "$focused")
        # Exactly '/' and nothing else. Not "a link", not "something in the
        # nav": a world whose first tab stop is its own chapter rail has lost
        # the door for the visitor who arrived on a forwarded link and has
        # nothing behind the Back button, which is the whole reason the frame
        # renders the exit first and outside the Stage subtree.
        if [ "$fhref" != "/" ]; then
            echo "    FAIL: first tab stop is $(str tag "$focused") href='${fhref}', expected the résumé door ('/')"
            fail=1
        elif [ "${fh:-0}" -lt 44 ] || [ "${fw:-0}" -lt 44 ]; then
            echo "    FAIL: door is ${fw}x${fh}, below the 44x44 target minimum"; fail=1
        fi

        # A13 — print safety, statically. The browse daemon exposes no print
        # media emulation, so this is the checkable half rather than a pretend
        # full check: no beat may live inside a `.no-print` subtree (which would
        # delete résumé content from a printed page), and the chrome that SHOULD
        # vanish must be marked. Stated as an approximation on purpose — a gate
        # that overstates what it measured is the failure this file's header is
        # about.
        bnp=$(num beatsInsideNoPrint "$report")
        [ "${bnp:-0}" -gt 0 ] && { echo "    FAIL: ${bnp} beat(s) inside a .no-print subtree — lost on print"; fail=1; }
        if [ "$(num noPrintChrome "$report")" = "0" ]; then
            echo "    FAIL: no .no-print chrome — the door would print"; fail=1
        fi

        $B screenshot "$OUT/$id-$expw.png" >/dev/null
    done

    # ── A6 / A7, evaluated across the three rows ────────────────────────────
    uniq_beats=$(uniq_words "$beats_seen")
    uniq_tier=$(uniq_words "$tier_seen")

    if [ "$uniq_beats" = "0 " ] || [ -z "$uniq_beats" ]; then
        note_pending "$id: no element carries data-beat-id, so assertions 6 (beat
    count identical at all three viewports) and 7 (the tier actually changed)
    measured nothing. The stage renders beats — the probe counts them via
    '.xp-beat' — but the STAMP the gate reads does not exist yet. The shared
    Stage (task X8) must put data-beat-id on every beat element and the frame
    must stamp body[data-tier] with the resolved tier. Until then this gate
    cannot tell 'retold shorter' from 'hidden', which is the single assertion
    the charter's non-negotiable 4 depends on."
    else
        count=$(printf '%s' "$uniq_beats" | wc -w | tr -d ' ')
        if [ "$count" -ne 1 ]; then
            echo "  FAIL A6: beat count differs across viewports ($uniq_beats) — a tier"
            echo "           RETELLS the story, it never drops a beat"
            fail=1
        else
            n=${uniq_beats% }
            if [ -z "$REF_BEATS" ]; then
                REF_BEATS="$n"
                echo "  A6 reference beat count: $REF_BEATS (from '$id')"
            elif [ "$n" != "$REF_BEATS" ]; then
                echo "  FAIL A6: '$id' tells $n beats; every other world tells $REF_BEATS."
                echo "           Every world tells the SAME résumé — this one lost content."
                fail=1
            fi
        fi
    fi

    # An ABSENT tier stamp is not a pass. It was one until 2026-08-22: the guard
    # below was `[ -n "$uniq_tier" ]`, so a stage that stamped nothing skipped A7
    # in silence and the run still printed green for the assertion whose entire
    # job is to stop A6 passing for the wrong reason. That is precisely the
    # "reports green having tested nothing" failure this file's header names, so
    # the empty case is now the loudest branch rather than the quietest.
    if [ -z "$uniq_tier" ]; then
        note_pending "$id: no element carries data-tier, so assertion 7 (the tier
    actually changed between 390 and 1440) measured nothing — and without it
    assertion 6's identical beat count across the three viewports proves only
    that the page never re-rendered. The stage must stamp data-tier with the
    resolved tier on its own root, beside data-xp-stage."
    else
        tcount=$(printf '%s' "$uniq_tier" | wc -w | tr -d ' ')
        if [ "$tcount" -lt 2 ]; then
            echo "  FAIL A7: data-tier never changed across 390/820/1440 ('$uniq_tier')."
            echo "           Assertion 6 would then be passing for the wrong reason."
            fail=1
        fi
    fi

    # ── A8 — reduced-motion completeness ────────────────────────────────────
    # The bar is not "less motion". Nothing may be HIDDEN by the still: the same
    # heading and beat assertions are re-run under stillness, because the easy
    # way to make a timeline stop is to never reveal what it was going to move,
    # and that reads as a shorter résumé.
    echo "  ── reduced motion ──"
    $B viewport 1440x900 >/dev/null
    clear_console
    $B goto "$URL/experience/$id/" >/dev/null
    # Set and reload in ONE expression: split across two commands the live page
    # can re-persist its own state between them.
    $B js "localStorage.setItem('kk-reduce-motion','1'); location.reload(); 'go'" >/dev/null
    settle
    rm_report=$($B js "$(probe_js)")
    running=$($B js "(() => String(document.getAnimations().filter(a => a.playState === 'running').length))()")
    echo "    $rm_report"
    echo "    running animations: $running"

    if [ "$(str experience "$rm_report")" != "$id" ]; then
        echo "    WARN: reduced-motion probe void — page reports '$(str experience "$rm_report")'"
    else
        case "$running" in
            ''|*[!0-9]*) echo "    WARN: animation probe returned '$running'" ;;
            0) : ;;
            *) echo "    FAIL A8: $running animation(s) still running under reduced motion —"
               echo "             stillness is a hard gate, not a shorter duration"; fail=1 ;;
        esac
        rinv=$(num invisible "$rm_report")
        [ "${rinv:-0}" -gt 0 ] && { echo "    FAIL A8: ${rinv} heading(s) HIDDEN by the still, not stilled"; fail=1; }
        rrendered=$(num rendered "$rm_report")
        # `rendered` counts what the stage actually put on the page, stamped or
        # not, so this half of A8 works today and keeps working after X8 lands.
        if [ "${rrendered:-0}" -eq 0 ]; then
            echo "    FAIL A8: no beat rendered under reduced motion — the still HID the story"; fail=1
        fi
        check_console "$id-reduced"
        $B screenshot "$OUT/$id-reduced-motion.png" >/dev/null
    fi
    # Put the browser back the way it was found. A stored stillness request that
    # leaks into the next world's rows would silently disable A8 for it.
    $B js "localStorage.removeItem('kk-reduce-motion'); location.reload(); 'go'" >/dev/null
    settle

    # ── A9 — one rAF loop maximum ───────────────────────────────────────────
    # `requestAnimationFrame` is patched AFTER load and counted over three
    # seconds. That is sound for the thing being measured: a self-rescheduling
    # loop re-reads the global every frame, so it is captured from the next
    # frame onward. A loop that schedules once and stops is not a loop and is
    # correctly not counted.
    $B goto "$URL/experience/$id/" >/dev/null
    settle
    $B js "(() => {
      const w = window;
      const orig = w.requestAnimationFrame.bind(w);
      const counts = new Map();
      w.__xpRafCounts = counts;
      w.requestAnimationFrame = function (cb) {
        counts.set(cb, (counts.get(cb) || 0) + 1);
        return orig(cb);
      };
      return 'armed';
    })()" >/dev/null
    $B js "new Promise(r=>setTimeout(()=>r('ok'),3000))" >/dev/null
    # 30 re-registrations in 3s is ~10fps — comfortably above anything episodic
    # (a one-shot entrance, a scroll settle) and far below a real 60fps loop.
    loops=$($B js "(() => {
      let n = 0;
      window.__xpRafCounts.forEach((v) => { if (v >= 30) n += 1; });
      return String(n);
    })()")
    echo "  rAF loops: $loops"
    case "$loops" in
        ''|*[!0-9]*) echo "    WARN: rAF probe returned '$loops'" ;;
        0|1) : ;;
        *) echo "    FAIL A9: $loops concurrent rAF loops — the contract allows at most 1"; fail=1 ;;
    esac
done

# ═════════════════════════════════════════════════════════════════════════════
# A10 — TOKEN HYGIENE (M29) ACROSS A CLIENT-SIDE CROSSING
#
# This has to be a CLICK, not a `goto`. A `goto` is a fresh document, which
# discards `body.style` for free and would make the assertion vacuous — the leak
# M29 exists to catch only happens when the visitor crosses between worlds
# WITHOUT a document load, which is the primary interaction on this route.
#
# The captured key set rides on `window`, which survives a `next/link`
# transition, so the comparison is made in the page rather than marshalled
# through the shell.
# ═════════════════════════════════════════════════════════════════════════════
echo
echo "════════ A10 token hygiene ════════"
if [ "${#ID_ARRAY[@]}" -lt 2 ]; then
    note_pending "A10 (token hygiene across a crossing) needs at least two worlds and
    the registry currently has ${#ID_ARRAY[@]}. It is not skipped for convenience — with
    one world there is no crossing to leak across. It arms itself the moment a
    second entry lands; no edit to this file."
else
    A="${ID_ARRAY[0]}"; Bw="${ID_ARRAY[1]}"
    clear_console
    $B goto "$URL/experience/$A/" >/dev/null
    settle
    keysA=$($B js "(() => {
      const s = document.body.style;
      const keys = [];
      for (let i = 0; i < s.length; i += 1) if (s[i].startsWith('--xp-')) keys.push(s[i]);
      window.__xpKeysA = keys;
      return keys.join(',') || '<none>';
    })()")
    echo "  '$A' writes: $keysA"

    $B click "nav[aria-label='Leave this experience'] a[href\$='/experience/']" >/dev/null
    settle
    $B click "[data-experience-id='$Bw'] a" >/dev/null
    settle

    leak=$($B js "(() => {
      const s = document.body.style;
      const now = [];
      for (let i = 0; i < s.length; i += 1) if (s[i].startsWith('--xp-')) now.push(s[i]);
      const id = document.body.dataset.experience || '<none>';
      const prior = window.__xpKeysA || [];
      const survived = prior.filter((k) => now.includes(k));
      return JSON.stringify({ id: id, now: now.join(','), survived: survived.join(',') });
    })()")
    echo "  after crossing: $leak"
    if [ "$(str id "$leak")" != "$Bw" ]; then
        echo "  WARN: crossing did not land on '$Bw' (landed on '$(str id "$leak")') — A10 void"
    else
        # A key of A's that is also a key of B is not a leak — B set it itself.
        # The leak is a key A set that B's map does not contain, and the only way
        # to know B's map is to read what B wrote from a CLEAN load; a full
        # reload here is safe because the comparison already happened above.
        $B goto "$URL/experience/$Bw/" >/dev/null
        settle
        cleanB=$($B js "(() => {
          const s = document.body.style;
          const keys = [];
          for (let i = 0; i < s.length; i += 1) if (s[i].startsWith('--xp-')) keys.push(s[i]);
          return keys.join(',') || '<none>';
        })()")
        echo "  '$Bw' from a clean load writes: $cleanB"
        crossed=$(str now "$leak")
        if [ "${crossed:-}" != "$(printf '%s' "$cleanB" | sed 's/<none>//')" ]; then
            echo "  FAIL A10: after '$A' → '$Bw' the applied key set is '${crossed:-<none>}',"
            echo "            but '$Bw' loaded clean applies '$cleanB'. A token survived the"
            echo "            crossing — clearExperienceTokens is not clearing the full list."
            fail=1
        fi
    fi
    check_console "token-hygiene"
fi

# ═════════════════════════════════════════════════════════════════════════════
# E.3 — PART TWO, and D5
# ═════════════════════════════════════════════════════════════════════════════
echo
echo "════════ E.3 default route — after the full sweep ════════"
$B viewport 1440x900 >/dev/null
clear_console
$B goto "$URL/" >/dev/null
settle
BASE_AFTER=$($B js "$DEFAULT_PROBE")
echo "  $BASE_AFTER"

if [ "$BASE_AFTER" != "$BASE_BEFORE" ]; then
    echo "  FAIL D1-D4: / is not what it was before the sweep."
    echo "         before: $BASE_BEFORE"
    echo "          after: $BASE_AFTER"
    echo "         This is the assertion that matters most: a browser that has been"
    echo "         through every world must leave the résumé bit-identical."
    fail=1
else
    echo "  D1-D4 pass: / is identical before and after visiting every world"
fi
check_console "default-after"

# D5 — the existing skin gate, unmodified, still green. Two halves, because
# "it passes" is worthless if the way it passes was by being edited.
echo
echo "════════ E.3 D5 — the skin gate ════════"
if ! git -C "$ROOT" diff --quiet HEAD -- scripts/qa-skins.sh 2>/dev/null; then
    echo "  FAIL D5: scripts/qa-skins.sh has been modified. It is out of scope for"
    echo "           every task in this project — escalate rather than edit it."
    fail=1
else
    echo "  qa-skins.sh is unmodified against HEAD"
fi

if [ "${XP_QA_SKIP_SKINS:-0}" = "1" ]; then
    note_pending "D5 sub-gate skipped (XP_QA_SKIP_SKINS=1). Run it before landing:
    bash scripts/qa-skins.sh"
else
    echo "  running scripts/qa-skins.sh (serialised — it shares this daemon)…"
    if bash "$ROOT/scripts/qa-skins.sh" "$URL/" "$OUT/skins" > "$OUT/qa-skins.log" 2>&1; then
        echo "  qa-skins.sh exits 0 — see $OUT/qa-skins.log"
    else
        echo "  FAIL D5: qa-skins.sh does not exit 0 — see $OUT/qa-skins.log"
        tail -20 "$OUT/qa-skins.log" | sed 's/^/         /'
        fail=1
    fi
fi

# ═════════════════════════════════════════════════════════════════════════════
echo
if [ "$fail" -ne 0 ]; then
    echo "FAILURES PRESENT"
    [ "$pending" -ne 0 ] && { echo; echo "…and these gates could not run at all:"; printf '%s' "$PENDING_NOTES"; }
    exit 1
fi
if [ "$pending" -ne 0 ]; then
    echo "INCOMPLETE — no defect found, but these gates could not run:"
    printf '%s' "$PENDING_NOTES"
    echo "A gate that could not measure does not report green."
    exit 1
fi
echo "ALL EXPERIENCES PASS (${#ID_ARRAY[@]} world(s), 4 viewports each)"
