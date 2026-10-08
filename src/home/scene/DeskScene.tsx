'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { SceneConfig, SceneView } from '../types';
import { fill, label, labelList } from '@/xp/label';
import type { Engine } from './engine';
import './scene.css';

/**
 * Home hero: a 360° desk with a MacBook and a cut-out standee of the owner.
 * The three.js engine (./engine) is imported only inside the effect, so the
 * static export renders just this shell + loading state. Orbit on touch is a
 * one-finger HORIZONTAL drag; vertical drags scroll the page (touch-action: pan-y).
 */
export default function DeskScene({ scene }: { scene: SceneConfig }) {
    const L = scene.labels;
    const hostRef = useRef<HTMLDivElement>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Engine | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
    const [active, setActive] = useState<string | null>(scene.defaultView);
    const [rotate, setRotate] = useState(scene.autoRotate);
    const [angle, setAngle] = useState<{ az: number; el: number; dist: number } | null>(null);
    const [copied, setCopied] = useState(false);
    const [flash, setFlash] = useState(false);
    const flashTimer = useRef(0);
    const pulse = useCallback(() => {
        setFlash(true);
        window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setFlash(false), 2500);
    }, []);

    const byId = useMemo(() => new Map(scene.views.map((v) => [v.id, v])), [scene.views]);
    const initial = byId.get(scene.defaultView) ?? scene.views[0];

    useEffect(() => {
        let cancelled = false;
        const host = hostRef.current, bubble = bubbleRef.current;
        if (!host || !bubble) return;
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2') ?? probe.getContext('webgl');
        if (!gl) { queueMicrotask(() => { if (!cancelled) setStatus('fallback'); }); return; }
        (gl.getExtension('WEBGL_lose_context') as { loseContext?: () => void } | null)?.loseContext?.();

        const deep = new URLSearchParams(window.location.search).get('view');
        const start = (deep && byId.get(deep)) || initial;
        import('./engine').then(({ createEngine }) => createEngine({
            host, bubble, scene,
            reactions: labelList(L, 'reactions'),
            initialView: start,
            onReady: () => { if (!cancelled) { setStatus('ready'); setActive(start.id); } },
            onAngle: (az, el, dist) => { if (!cancelled) { setAngle({ az, el, dist }); pulse(); } },
            onUserOrbit: () => { if (!cancelled) setActive(null); },
        })).then((eng) => {
            if (cancelled) { eng.dispose(); return; }
            engineRef.current = eng;
        }).catch(() => { if (!cancelled) setStatus('fallback'); });

        return () => {
            cancelled = true;
            engineRef.current?.dispose();
            engineRef.current = null;
        };
        // scene config is static per build; re-running would rebuild the GL context.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const choose = useCallback((v: SceneView) => {
        setActive(v.id);
        pulse();
        engineRef.current?.goTo(v);
    }, [pulse]);
    const toggleRotate = () => {
        const next = !rotate;
        setRotate(next);
        engineRef.current?.setAutoRotate(next);
    };
    const reset = () => {
        setRotate(false);
        engineRef.current?.setAutoRotate(false);
        choose(initial);
    };
    const copy = async () => {
        if (!angle) return;
        try {
            await navigator.clipboard.writeText(`azimuth: ${angle.az}, elevation: ${angle.el}, distance: ${angle.dist}`);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch { /* clipboard blocked — readout is still visible */ }
    };

    const vars = useMemo(() => {
        const v: Record<string, string> = {};
        for (const [k, c] of Object.entries(scene.colors.light)) v[`--dsl-${k}`] = c;
        for (const [k, c] of Object.entries(scene.colors.dark)) v[`--dsd-${k}`] = c;
        return v as CSSProperties;
    }, [scene.colors]);

    return (
        <div className="ds" role="region" aria-label={label(L, 'region')} data-status={status} style={vars}>
            <div ref={hostRef} className="ds-stage">
                <div ref={bubbleRef} className="ds-bubble xp-glass" data-show="false" aria-live="polite" />
            </div>

            {status === 'loading' && <div className="ds-loading" aria-live="polite"><span>{label(L, 'loading')}</span></div>}

            {status === 'fallback' && (
                <div className="ds-fallback" aria-label={label(L, 'fallback')}>
                    <div className="ds-fb-mac" aria-hidden="true"><span>{scene.screenLines[0] ?? ''}</span></div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="ds-fb-figure" src={scene.figure.src} alt={scene.figure.alt} />
                    <div className="ds-fb-desk" aria-hidden="true" />
                </div>
            )}

            {status === 'ready' && (
                <>
                    <span className="ds-angle xp-glass" data-show={flash} aria-live="off">
                        {angle ? fill(label(L, 'angle'), { az: angle.az, el: angle.el }) : ''}
                    </span>
                    <div className="ds-ui xp-glass">
                        <div className="ds-views" role="group" aria-label={label(L, 'views')}>
                            {scene.views.map((v) => (
                                <button key={v.id} type="button" className="ds-chip" aria-pressed={active === v.id} onClick={() => choose(v)}>
                                    {v.label}
                                </button>
                            ))}
                        </div>
                        <div className="ds-icons">
                            <button type="button" className="ds-icon xp-glass-btn" aria-pressed={rotate} onClick={toggleRotate} aria-label={label(L, 'rotate')} title={label(L, 'rotate')}>
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" /></svg>
                            </button>
                            <button type="button" className="ds-icon xp-glass-btn" onClick={reset} aria-label={label(L, 'reset')} title={label(L, 'reset')}>
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.34-5.66M4 4v4h4" /><circle cx="12" cy="12" r="1.6" /></svg>
                            </button>
                            <button type="button" className="ds-icon xp-glass-btn" onClick={copy} aria-label={copied ? label(L, 'copied') : label(L, 'copy')} title={label(L, 'copy')}>
                                {copied
                                    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                                    : <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2.5" /><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" /></svg>}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
