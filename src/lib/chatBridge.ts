/**
 * The one cross-component contract between "something asked for the assistant"
 * and "the chat panel opened".
 *
 * The string was previously declared twice — once in `ChatWidget` (the
 * listener) and once in `HeroA` (a dispatcher) — so the two ends of a
 * `window` event were kept in sync by hand. It now has exactly one definition.
 *
 * It also has to live outside `HeroA`: the shipped hero imports it, and a
 * *value* import from `HeroA` would drag that whole component back into the
 * page's module graph and undo `HeroSwitcher`'s `dynamic()` split (E4).
 */
export const OPEN_CHAT_EVENT = 'kk:open-chat';

/** Ask the chat panel to open. No-op on the server. */
export function openChat() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT));
}
