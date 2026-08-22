import type { ReactNode } from 'react';
import { EXPERIENCE_PREPAINT } from '@/experiences/registry';

/**
 * The stage segment's shell, and the home of the one thing that cannot wait for
 * React: the blocking pre-paint ground stamp for a COLD DEEP LINK.
 *
 * ── Why this exists at all, when `/` already has a pre-paint script ─────────
 * The problem this solves is strictly smaller than the one `THEME_INIT_SCRIPT`
 * solves, and it splits in two (§A.6):
 *
 *   Case 1 — arriving from the dashboard. The document is already painted and
 *     `next/link` makes it a client-side transition. There is no first paint to
 *     lose; `ExperienceProvider` stamps the body and writes the token map in an
 *     effect. **This case needs nothing.**
 *
 *   Case 2 — a forwarded `/experience/<id>/` opened cold. This is a real first
 *     paint. If the world declares a `ground` that differs from the visitor's
 *     resolved appearance, they get the exact flash M42 was written to kill: a
 *     white page that repaints to near-black after hydration.
 *
 * ── Why it is here and not in `src/app/layout.tsx` ──────────────────────────
 * The root layout has exactly one owner and `THEME_INIT_SCRIPT` is not touched
 * by this feature. It does not need to be: a synchronous inline script blocks
 * the parser AT ITS POSITION, so everything below it in this segment has not
 * painted yet. `<head>` is where a script must live when it has to beat the
 * whole document; this one only has to beat the rest of one route segment.
 *
 * That also means `/` never ships a byte of this. The string below is
 * serialised into the static HTML of the stage routes only.
 *
 * ── Why it reads the id from `location.pathname` and not from storage ───────
 * The URL *is* the state. This feature adds no `localStorage` key at all —
 * there is no `kk-experience` — because a stored world would silently override
 * a forwarded link, and because M18's lesson (never place a visitor in the most
 * opinionated design on the site before they have read a word) applies here with
 * more force than it did to `coder`.
 *
 * Reading the LAST path segment is also what makes it correct under a non-empty
 * `basePath`: `/kaush4l.github.io/experience/ascent/` and `/experience/ascent/`
 * both end in the id.
 *
 * ── Why it only ever SETS ───────────────────────────────────────────────────
 * `ExperienceProvider` remains the single owner of the full write (M32). This
 * script writes exactly one property, and it is the one the provider is about to
 * overwrite with the identical value — both read `Experience.ground.bg`, which
 * is written once in the world's own config (§A.6). It never clears anything, so
 * it can never be the thing that leaves state behind on `/`.
 *
 * `EXPERIENCE_PREPAINT` is a PROJECTION of `EXPERIENCE_LIST`, not a second
 * table: unlike `SKIN_PREPAINT` there is no hand-maintained twin that could
 * drift. A world that declares no `ground` is simply absent from the record, and
 * `if(!g)return;` is then the complete handling of "this world inherits the
 * visitor's appearance" — which is the recommended default, and is why this
 * record is empty today and the script is a deliberate no-op.
 */
const XP_INIT = `(function(){try{var b=document.body,P=${JSON.stringify(EXPERIENCE_PREPAINT)},id=location.pathname.replace(/\\/+$/,'').split('/').pop(),g=Object.prototype.hasOwnProperty.call(P,id)?P[id]:null;if(!g)return;b.dataset.experience=id;b.style.setProperty('--xp-bg',g.bg);document.documentElement.style.colorScheme=g.stamp;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',g.bg);}catch(e){}})();`;

export default function ExperienceStageLayout({ children }: { children: ReactNode }) {
    return (
        <>
            {/* Inline, no `src`, no `async` — React renders it in place rather
                than hoisting it, which is the entire point: it must run before
                the markup beneath it parses. */}
            <script dangerouslySetInnerHTML={{ __html: XP_INIT }} />
            {children}
        </>
    );
}
