import type { Metadata, Viewport } from "next";
import { Amarante, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
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

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0F14" },
  ],
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

// `display: 'optional'` — Amarante renders exactly two words (the hero
// surname). A decorative face must never block or swap the LCP heading: if it
// is not in cache within the ~100ms block period the fallback stands for this
// page view and the face arrives silently on the next one.
const amarante = Amarante({
  subsets: ["latin"],
  weight: ["400"],
  display: "optional",
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

// Blocking, pre-paint theme stamp. This is a static export — there is no server
// to resolve the color mode, so the very first frame would otherwise be light.
const THEME_INIT_SCRIPT = `(function(){try{var k='kk-color-mode';var s=window.localStorage.getItem(k);var dark=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var el=document.documentElement;el.dataset.theme=dark?'dark':'light';el.style.colorScheme=dark?'dark':'light';}catch(err){}})();`;

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
