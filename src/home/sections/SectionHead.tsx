export default function SectionHead({ id, eyebrow, title, sticky }: { id: string; eyebrow: string; title: string; sticky?: boolean }) {
    return (
        <header className={`hm-head${sticky ? ' hm-head-sticky' : ''}`}>
            {eyebrow && <p className="hm-eyebrow">{eyebrow}</p>}
            <h2 id={id} className="hm-title xp-display" data-scrub>{title}</h2>
        </header>
    );
}
