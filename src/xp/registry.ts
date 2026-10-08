import type { ComponentType } from 'react';
import type { XpThemeProps } from './types';
import GoogleTheme from './themes/google';
import LinkedinTheme from './themes/linkedin';
import GithubTheme from './themes/github';
import YoutubeTheme from './themes/youtube';

/**
 * Renderer key (an md file's `theme:`) → component. This is the only table in
 * code: a new experience that reuses an existing renderer is a new md file and
 * a rebuild, nothing more. A new *kind* of renderer is one file plus one line.
 */
export const THEMES: Record<string, ComponentType<XpThemeProps>> = {
    google: GoogleTheme,
    linkedin: LinkedinTheme,
    github: GithubTheme,
    youtube: YoutubeTheme,
};
