/** A résumé entry dressed as a video. Built on the server, serialised to the client. */
export interface YtVideo {
    id: string;
    kind: 'role' | 'project';
    title: string;
    channel: string;
    period: string;
    location: string;
    link: string;
    summary: string;
    bullets: string[];
    tags: string[];
    age: string;
    duration: string;
    live: boolean;
    /** 1..6 → `--xp-thumb-N` gradient start. */
    thumb: number;
    sortKey: number;
}
