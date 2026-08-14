import type { Metadata, Viewport } from "next";
import { Amarante, Inter, JetBrains_Mono } from "next/font/google";
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

const fontVariables = `${inter.variable} ${amarante.variable} ${jetbrainsMono.variable}`;

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
const THEME_INIT_SCRIPT = `(function(){try{var el=document.documentElement;var s=null;try{s=localStorage.getItem('kk-appearance');}catch(e){}if(s!=='light'&&s!=='dark'&&s!=='coder'){var g=null;try{g=localStorage.getItem('kk-color-mode');}catch(e){}s=(g==='light'||g==='dark')?g:null;}if(s===null){s=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var dark=s!=='light';el.dataset.theme=dark?'dark':'light';if(s==='coder'){el.dataset.effects='coder';}else{delete el.dataset.effects;}el.style.colorScheme=dark?'dark':'light';var bg=s==='coder'?'#0A0A0F':(dark?'#12151C':'#FAFAFA');var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement('meta');m.setAttribute('name','theme-color');document.head.appendChild(m);}m.setAttribute('content',bg);try{if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){el.dataset.motion='on';setTimeout(function(){if(el.dataset.motion==='on'){delete el.dataset.motion;}},4000);}}catch(e){}}catch(err){}})();`;

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
