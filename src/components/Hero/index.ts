// E4: B/C/D are deliberately NOT re-exported. Re-exporting them here pulled all
// four heroes into the consumer's module graph and made HeroSwitcher's
// `dynamic()` calls inert — the dev-only variants shipped to every production
// visitor. `HeroSwitcher` is their only reference; keep it that way.
export { default as HeroA } from './HeroA';
export type { HeroProps, HeroAbout } from './HeroA';
export { default as HeroSwitcher } from './HeroSwitcher';
export type { HeroVariant } from './HeroSwitcher';
