'use client';

import { openChat } from '@/lib/chatBridge';

export default function HeroActions({ primary, primaryHref, secondary }: { primary: string; primaryHref: string; secondary: string }) {
    return (
        <div className="hm-actions">
            <a href={primaryHref} className="hm-btn hm-btn-primary hm-press">{primary}</a>
            <button type="button" className="hm-btn hm-btn-glass xp-glass hm-press" onClick={() => openChat()}>{secondary}</button>
        </div>
    );
}
