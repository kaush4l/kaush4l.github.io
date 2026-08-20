import type { Metadata, Viewport } from "next";
import {
  Amarante,
  Inter,
  JetBrains_Mono,
  // ── Skin faces ────────────────────────────────────────────────────────────
  // Every one of these is `preload: false` and Latin-subset only.
  //
  // `preload: false` is the whole reason nine extra families are affordable:
  // next/font emits the @font-face rules at build time but adds no
  // <link rel="preload">, and a browser fetches a face only when a rule
  // actually selects it. A visitor on the professional skin therefore pays
  // nothing for the other four — not a request, not a byte.
  //
  // Latin-only matters even more for the Japanese and Devanagari faces. The
  // full `japanese` subset of a mincho is several megabytes; the résumé is
  // written in English, so the CJK and Devanagari coverage would be paid for
  // and never rendered. If a skin ever sets a real Japanese or Devanagari
  // line, add that subset to that face alone — never to all of them.
  Shippori_Mincho_B1,
  Zen_Kaku_Gothic_New,
  Rozha_One,
  Martel,
  Khand,
  Space_Mono,
  Instrument_Serif,
  Newsreader,
  Archivo,
} from "next/font/google";
import "./globals.css";
// The coder-mode effects layer. Every rule inside is scoped under
// `[data-effects="coder"]`, which is present only when the user has explicitly
// chosen Coder — so this import is inert in light and dark. Deleting the file
// must leave a correct, complete dark theme (see the INVARIANT in ThemeProvider).
import "./coder.css";
// The cinematic effects layer — the hero's lighting rig, film grain, vignette
// and the scroll-reveal transitions. Every rule is scoped to `.hc*` / `.reveal`,
// and deleting the file must leave a complete, readable page (see the header
// comment in cinema.css).
import "./cinema.css";
import { ThemeProvider } from "@/theme/ThemeProvider";
// Ground literals only — this module imports nothing, precisely so the head
// script can carry them without dragging a skin module (and its hero) into
// the first paint. See the header comment in that file.
import { SKIN_PREPAINT } from "@/skins/preload";
// The perspective-skin stylesheets. Every rule inside is scoped under
// html[data-skin="…"], an attribute that is absent on the professional skin,
// so this import is inert by default — exactly like coder.css. Deleting the
// file must leave a complete, readable résumé under every skin.
import "./skins.css";
// One file per skin — separate files rather than one, so that the four
// perspectives never share a merge surface and each can be deleted on its
// own without disturbing the others.
import "./skin-ronin.css";
import "./skin-sanctum.css";
import "./skin-terminal.css";
import "./skin-accession.css";

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';

const SITE_URL = "https://kaush4l.github.io";
const SITE_NAME = "Kaushal Kanakamedala";
const SITE_TITLE = "Kaushal Kanakamedala — Senior Software Engineer";
// This is the string in a Google result and in the Slack unfurl when a hiring
// manager forwards the link — read by more people than the page. Every fact
// below is sourced from `content/`: the bio's role, location and "8+ years",
// the employer names on the experience entries, and the Salesforce Kafka
// figure. Do not add a claim here that no content file supports.
const SITE_DESCRIPTION =
  "Kaushal Kanakamedala — Senior Software Engineer in Durham, NC. 8+ years shipping production systems at Fidelity, Salesforce, Oracle and Cerner, including Kafka change-data-capture pipelines at 10M+ events per hour. Ask this résumé questions directly: the model answering runs in your browser on your own GPU, with no server.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "profile",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    // `summary_large_image` promises a 1200x630 image. `public/` has none, so
    // clients render an empty image frame — declaring a capability that is not
    // fulfilled. Restore `summary_large_image` (and add `openGraph.images` +
    // `twitter.images`) in the same commit that adds `public/og.png`, not before.
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

// M7 — `themeColor` was declared as a `prefers-color-scheme` pair, i.e. keyed to
// the **OS** rather than to the user's in-page choice, so an OS-light visitor
// who picked dark kept a white mobile chrome band above a black page,
// permanently. A static export cannot resolve a stored choice at build time, so
// what stays here is one honest default — the light ground, which is also the
// no-JS rendering (M40). The pre-paint script below rewrites this same tag from
// the resolved appearance before first paint, and `ThemeProvider` rewrites it
// again on every change. One tag, one owner chain, never a media query.
//
// M40 — `colorScheme` is `light`, not the pair `light dark`, for the same
// reason: with JS disabled the init script never runs, `data-theme` is never
// stamped, and the page renders `globals.css`'s `:root` light literals. Saying
// "light dark" there let the browser paint dark native controls over a light
// page. The pre-paint script and `ThemeProvider` both set
// `documentElement.style.colorScheme`, which overrides this meta the moment JS
// is available, so nothing is lost for the 99% path.
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#FAFAFA",
};

// ─── Fonts ───────────────────────────────────────────────────────────────────
// Inter is the body/UI face. Amarante is reserved for exactly one element
// (the hero surname). JetBrains Mono is the single "code voice" token.

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

// `display: 'swap'` — Amarante renders exactly two words (the hero surname) and
// is the only piece of brand identity on the page. `optional` was tried first to
// protect the LCP heading, but it gives the face a ~100ms block period and then
// *never* swaps for that page view — so a first-time visitor, precisely the
// audience this page exists for, simply never saw it. A brand face nobody sees is
// not a brand face. `swap` guarantees it renders; the preload plus next/font's
// automatic fallback-metric adjustment keep the reflow negligible.
const amarante = Amarante({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-display",
});

// 400 only. No rule anywhere requests mono at 500 — the two call sites
// (`ContentCard` period captions, `HeroB`'s terminal) and `.prose-content code`
// all render at the default weight, so the second file was pure download.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-mono",
});


// ─── Skin faces ──────────────────────────────────────────────────────────────
// Declared here because next/font must be called at module scope, but CHOSEN by
// the skins — each skin's stylesheet maps `--font-display` (and `--font-sans`
// where it needs to) onto the variables below, under its own `[data-skin]`
// scope and on `body`, since next/font declares the variables on a body class.

// Rōnin — a brush-cut mincho for display over a humanist gothic for body. That
// split (mincho headings, sans body) is the pairing Japanese editorial design
// actually uses; a single face for both is what makes a "Japanese-inspired"
// page read as a costume.
const shipporiMincho = Shippori_Mincho_B1({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
  preload: false,
  variable: "--font-ronin-display",
});

const zenKaku = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
  variable: "--font-ronin-sans",
});

// Sanctum — Rozha One is the closest Google Fonts equivalent to the
// reverse-contrast Devanagari display faces this direction is drawn from.
// Khand is the condensed signage voice for dates and metrics.
const rozhaOne = Rozha_One({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  preload: false,
  variable: "--font-sanctum-display",
});

const martel = Martel({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
  preload: false,
  variable: "--font-sanctum-sans",
});

const khand = Khand({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  preload: false,
  variable: "--font-sanctum-label",
});

// Terminal — display mono only. Its body voice is JetBrains Mono and Inter,
// both already loaded, because setting an entire résumé in a display mono is
// the point at which the aesthetic stops being readable.
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
  preload: false,
  variable: "--font-terminal-display",
});

// Accession — Instrument Serif ships exactly two styles, and the ITALIC is the
// strongest single gesture available to that direction. Newsreader carries both
// an `opsz` and a `wght` axis, which is what lets a pull quote and a caption
// have genuinely different optical cadence rather than just different sizes.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--font-accession-display",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--font-accession-serif",
});

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-accession-label",
});

const skinFontVariables = [
  shipporiMincho.variable,
  zenKaku.variable,
  rozhaOne.variable,
  martel.variable,
  khand.variable,
  spaceMono.variable,
  instrumentSerif.variable,
  newsreader.variable,
  archivo.variable,
].join(" ");

const fontVariables = `${inter.variable} ${amarante.variable} ${jetbrainsMono.variable} ${skinFontVariables}`;

// Blocking, pre-paint appearance stamp. This is a static export — there is no
// server to resolve the appearance, so the very first frame would otherwise be
// light.
//
// M22 — the previous version computed a *boolean*: `s==='dark' || (s!=='light'
// && matchMedia(...).matches)`. A stored `'coder'` satisfies neither test, so it
// fell through to the media query and an OS-light coder user got a full-screen
// **white** first paint that then repainted to near-black after hydration —
// round 1's C1 defect, reintroduced by the new value. This version parses all
// three states and stamps both attributes before anything paints.
//
// Two invariants encoded here:
//   • `coder` is reachable ONLY from storage (M18). `prefers-color-scheme`
//     resolves to light or dark and nothing else — no visitor is ever placed in
//     the most opinionated design on the site by inference.
//   • `data-effects` is PRESENT or ABSENT. It is never set to "none": the
//     effects stylesheet keys every rule off the attribute's presence.
//
// It also stamps `data-motion="on"` when the visitor has NOT asked for reduced
// motion. That attribute is what hides the hero's entrance elements before the
// first paint (see `cinema.css`); the hero removes it as soon as its timeline
// owns those elements. The 4s self-clearing timeout is the safety net: if the
// application bundle never executes, the attribute drops itself and the hero is
// simply visible, rather than permanently blank.
//
// The three ground literals below must stay identical to `MODE_SURFACES` in
// `ThemeProvider.tsx` and to the token blocks in `globals.css` (M28). They are
// the only colours this script needs, because it sets `theme-color` — the
// document's own ground comes from the stylesheet.
//
// M42 — the script now resolves the SKIN first, because a skin may pin the
// appearance. Resolution order is: skin from storage, then that skin’s pin,
// then (only if it does not pin) the stored appearance, then the media query.
// Getting that order wrong is a visible bug rather than a subtle one: a
// visitor whose stored appearance is light and whose stored skin is black
// would get a full-screen white flash that repaints to near-black.
//
// The ground literals for the skins are NOT written here. They are
// interpolated from `SKIN_PREPAINT`, which is their single owner — the three
// appearance grounds below are the only ones still spelled out, and they must
// stay identical to `MODE_SURFACES` and to the token blocks in `globals.css`
// (M28).
const THEME_INIT_SCRIPT = `(function(){try{var el=document.documentElement;var SK=${JSON.stringify(SKIN_PREPAINT)};var k=null;try{k=localStorage.getItem('kk-skin');}catch(e){}if(!k||!Object.prototype.hasOwnProperty.call(SK,k)){k='professional';}if(k==='professional'){delete el.dataset.skin;}else{el.dataset.skin=k;}var pin=SK[k];var s=null;try{s=localStorage.getItem('kk-appearance');}catch(e){}if(s!=='light'&&s!=='dark'&&s!=='coder'){var g=null;try{g=localStorage.getItem('kk-color-mode');}catch(e){}s=(g==='light'||g==='dark')?g:null;}if(s===null){s=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var stamp,fx,bg;if(pin){stamp=pin.stamp;fx=pin.effects||null;bg=pin.bg;}else{var dark=s!=='light';stamp=dark?'dark':'light';fx=(s==='coder')?'coder':null;bg=s==='coder'?'#0A0A0F':(dark?'#12151C':'#FAFAFA');}el.dataset.theme=stamp;if(fx){el.dataset.effects=fx;}else{delete el.dataset.effects;}el.style.colorScheme=stamp;var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement('meta');m.setAttribute('name','theme-color');document.head.appendChild(m);}m.setAttribute('content',bg);try{if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){el.dataset.motion='on';setTimeout(function(){if(el.dataset.motion==='on'){delete el.dataset.motion;}},4000);}}catch(e){}}catch(err){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={fontVariables} suppressHydrationWarning>
        <AppRouterCacheProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
