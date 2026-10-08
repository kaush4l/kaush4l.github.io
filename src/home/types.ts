import type { XpConfig, XpPalette, XpResume } from '@/xp/types';

export interface SceneView { id: string; label: string; azimuth: number; elevation: number; distance: number }

export interface SceneConfig {
    defaultView: string;
    autoRotate: boolean;
    autoRotateSpeed: number;
    views: SceneView[];
    screenLines: string[];
    /** light/dark colour sets for 3D materials (hex strings). */
    colors: { light: Record<string, string>; dark: Record<string, string> };
    figure: { src: string; alt: string; height: number };
    /** wide-viewport framing: shift the orbit target right by offsetX of canvas width when aspect > minAspect. */
    framing: { offsetX: number; minAspect: number };
    /** uniform scale of the MacBook + desk props. */
    macScale: number;
    /** every visible string the scene's controls need. */
    labels: Record<string, unknown>;
}

export interface HomeConfig {
    title: string;
    eyebrow: string;
    scene: SceneConfig;
    /** nav / hero / sections / footer copy, raw from md. */
    labels: Record<string, unknown>;
    palette: XpPalette;
    tokens: Record<string, string>;
}

export interface HomeData {
    config: HomeConfig;
    resume: XpResume;
    experiences: Pick<XpConfig, 'id' | 'title' | 'card' | 'palette'>[];
}
