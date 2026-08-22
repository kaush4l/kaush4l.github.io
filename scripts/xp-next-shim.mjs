/**
 * A bun preload shim for the two Next.js build-time macros a world's `index.ts`
 * is allowed to call, so the contrast/structure gate can import the registry
 * without a Next build.
 *
 * `bun --preload ./scripts/xp-next-shim.mjs scripts/xp-contrast.ts`
 *
 * `.mjs`, not `.ts`, and that is the house convention rather than an oversight:
 * `tsconfig.json` includes every TypeScript file in the repo and no `.mjs` file,
 * and the two scripts already here (`copy-onnxruntime-assets.mjs`,
 * `download-models.mjs`) are `.mjs` for the same reason. A preload harness that exists only to stand in for a
 * bundler is not application code and should not be in the application's
 * typecheck — and `bun:test` has no type declarations outside a test run, so
 * putting it there would mean a permanently red `tsc`. The GATE itself is `.ts`
 * and IS typechecked, because it reads typed config and its correctness matters.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * `next/font/google` is a build-time macro — the bundler rewrites the call into
 * emitted `@font-face` rules — and outside webpack the module does not export
 * the family functions at all: importing it under bun fails with
 * `Export named 'Inter' not found`. `next/dynamic` is a real module but drags a
 * React client runtime in for no reason here.
 *
 * The gate reads COLOURS and STRUCTURE. It never renders, so a font handle only
 * has to carry a `.variable` string and a component reference only has to be a
 * value. Stubbing both is what keeps the gate a plain `bun` script rather than a
 * headless browser run — which matters because a gate that is expensive to run
 * is a gate that gets skipped.
 *
 * The shim is deliberately NOT a mock of behaviour: it returns a variable name
 * derived from the call's own `variable` option, so a world that forgets to pass
 * one still produces a distinguishable value rather than a silent collision.
 *
 * The family list is DERIVED by scanning the source for the import statements —
 * see the note on `collectFamilies` for why a catch-all proxy cannot work here.
 */
import { mock } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The `next/font/google` families this repo actually imports, DERIVED by
 * scanning the source for the import statements themselves.
 *
 * ── Why a scan and not a Proxy ──────────────────────────────────────────────
 * This was a `Proxy` with a bare `get` trap, on the reasoning that it would
 * answer to any family name. It does not, and the failure is silent until the
 * first world declares a face: `next/font/google/index.js` is a ZERO-BYTE file
 * — the bundler rewrites the call site, so the module has no exports at all
 * outside webpack — and a static `import { Space_Grotesk } from …` therefore
 * needs the mocked namespace to carry a real own property under that exact
 * name. A `Proxy` without an `ownKeys`/`getOwnPropertyDescriptor` pair reports
 * no own keys, so the gate died with `Export named 'Space_Grotesk' not found`
 * and the whole contrast gate could not run. Adding those traps cannot fix it
 * either: `ownKeys` must return a FINITE list, which is precisely the thing a
 * catch-all proxy does not have.
 *
 * ── Why a scan and not a hand-written list ──────────────────────────────────
 * A literal array here would be a second statement of a fact the world configs
 * already make, and it would fail the same way the old proxy did — quietly, at
 * the moment a new world declares a face nobody remembered to add. The scan is
 * a projection of the source, so a new family is covered the moment it is
 * imported and this file is never edited again.
 *
 * If a family is still missed, the error is the original, honest one — an
 * unresolved named export naming the family — not a stub that renders wrong.
 */
const FAMILY_IMPORT = /import\s*\{([^}]*)\}\s*from\s*['"]next\/font\/google['"]/g;

function collectFamilies(dir, found) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        // `node_modules` and dot-directories are skipped: the only call sites
        // that matter are this repo's own, and walking the dependency tree
        // would turn a preload into a multi-second stall.
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            collectFamilies(full, found);
            continue;
        }
        if (!/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) continue;
        const src = readFileSync(full, 'utf8');
        for (const match of src.matchAll(FAMILY_IMPORT)) {
            for (const clause of match[1].split(',')) {
                // `Fraunces as Display` imports the module's `Fraunces`; the
                // local alias is irrelevant to what the namespace must carry.
                const name = clause.trim().split(/\s+as\s+/)[0].trim();
                if (name) found.add(name);
            }
        }
    }
    return found;
}

/**
 * One stub factory, shared by every family.
 *
 * Deliberately NOT a mock of behaviour: it echoes the call's own `variable`
 * option, so a world that forgets to pass one produces a distinguishable value
 * rather than a silent collision with its neighbour. The gate reads COLOURS and
 * STRUCTURE and never renders, so a handle only has to carry a `.variable`.
 */
const stubFamily = (options = {}) => ({
    variable: options.variable ?? '--font-unnamed',
    className: '',
    style: {},
});

const googleFonts = Object.fromEntries(
    [...collectFamilies(join(ROOT, 'src'), new Set())].map((name) => [name, stubFamily]),
);

mock.module('next/font/google', () => googleFonts);
mock.module('next/dynamic', () => ({
    default: () => function DynamicStub() { return null; },
}));
