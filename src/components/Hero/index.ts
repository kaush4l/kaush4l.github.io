// E4: no hero COMPONENT is re-exported here. Re-exporting one pulled it into
// the consumer's module graph and made HeroSwitcher's `dynamic()` calls inert —
// the dev-only variants shipped to every production visitor. `HeroSwitcher` is
// their only reference; keep it that way. Types are erased at build, so they
// are safe to re-export.
export type { HeroProps, HeroAbout } from './HeroA';
export { default as HeroSwitcher } from './HeroSwitcher';
export type { HeroVariant } from './HeroSwitcher';
