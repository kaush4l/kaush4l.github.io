/**
 * Metrics are the skimmer's landing lights.
 *
 * `4s → under 100ms`, `10M+ events per hour`, `3x throughput`, `85% coverage`,
 * `WCAG 2.1 AA` are set in mono 600 with tabular figures in the accent, in every
 * world identically (CREATIVE-SPEC §2.5) — which is what lets a hostile skimmer
 * skip the narration in peripheral vision without reading it. This module is the
 * "wrapped at build time" half of that rule: `Stage.tsx` is imported statically,
 * so every `<b class="xp-metric">` below is already in the exported HTML.
 *
 * ── The two things it must not do ───────────────────────────────────────────
 * It must not split a word, and it must not turn prose into markup. So it
 * returns React nodes rather than an HTML string — nothing here is ever fed to
 * `dangerouslySetInnerHTML` — and every pattern is anchored on a word boundary
 * with a unit attached, which is why `Java 8`, `Angular 17+`, `Spring Boot 3`
 * and `2011–2015` are left alone while `100ms`, `10M+`, `85%` and `40 minutes`
 * are lit. A résumé is full of bare numbers that are versions, not results;
 * lighting one of those would be worse than lighting none.
 */
import { Fragment, type ReactNode } from 'react';

/**
 * A measurement: a number welded to a unit, or the one named standard this
 * résumé cites. Deliberately narrow — the failure mode of a generous pattern is
 * a page of glowing version numbers, and there is no way to notice that from
 * inside the regex.
 */
const METRIC = new RegExp(
    [
        // 4s · 100ms · 500ms · 12 minutes · 40 minutes
        String.raw`\d+(?:\.\d+)?\s?(?:ms|s|min|mins|minute|minutes|hour|hours)\b`,
        // 85% · ~40% · 3x · 10M+ · 100GB+
        String.raw`~?\d+(?:\.\d+)?\s?(?:%|x|×)(?![a-z])`,
        String.raw`\d+(?:\.\d+)?\s?(?:M|K|B|GB|TB)\+?(?![a-z])`,
        // The one named standard in the content.
        String.raw`WCAG\s2\.1(?:\sAA)?`,
    ].join('|'),
    'gi',
);

/**
 * Split a string into text and lit metrics.
 *
 * Returns the original string unchanged as a single node when nothing matches,
 * which is the common case and costs one allocation.
 */
export function markMetrics(text: string, keyPrefix: string): ReactNode {
    // `lastIndex` is state on a shared `RegExp`; resetting it is not paranoia,
    // it is the difference between this function being pure and being ordered.
    METRIC.lastIndex = 0;
    if (!METRIC.test(text)) return text;
    METRIC.lastIndex = 0;

    const nodes: ReactNode[] = [];
    let cursor = 0;
    let match = METRIC.exec(text);
    let index = 0;

    while (match !== null) {
        if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
        nodes.push(
            <b className="xp-metric" key={`${keyPrefix}-m${index}`}>
                {match[0]}
            </b>,
        );
        cursor = match.index + match[0].length;
        index += 1;
        match = METRIC.exec(text);
    }
    if (cursor < text.length) nodes.push(text.slice(cursor));

    return <Fragment key={keyPrefix}>{nodes}</Fragment>;
}
