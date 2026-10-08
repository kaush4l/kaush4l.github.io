import type { YtVideo } from './model';

/** Generated thumbnail: palette gradient + big Amarante title + duration badge. */
export function Thumb({ v, big = false }: { v: YtVideo; big?: boolean }) {
    return (
        <div className={`yt-thumb yt-thumb--${v.thumb}${big ? ' yt-thumb--big' : ''}`} aria-hidden="true">
            <span className="yt-thumb-title xp-display">{v.title}</span>
            {v.channel && <span className="yt-thumb-sub">{v.channel}</span>}
            {v.duration && !v.live && <span className="yt-badge">{v.duration}</span>}
        </div>
    );
}
