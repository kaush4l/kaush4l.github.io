'use client';

/**
 * Icon registry — maps the string `icon` keys declared in each section's
 * `_section.md` to MUI icon components. Keeping this in one place means content
 * metadata can reference icons by name without importing components.
 */

import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import WorkIcon from '@mui/icons-material/Work';
import CodeIcon from '@mui/icons-material/Code';
import PersonIcon from '@mui/icons-material/Person';
import BuildIcon from '@mui/icons-material/Build';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import TerminalIcon from '@mui/icons-material/Terminal';
import LayersIcon from '@mui/icons-material/Layers';
import CloudIcon from '@mui/icons-material/Cloud';
import PsychologyIcon from '@mui/icons-material/Psychology';
import HandymanIcon from '@mui/icons-material/Handyman';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import EmailIcon from '@mui/icons-material/Email';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const REGISTRY: Record<string, ComponentType<SvgIconProps>> = {
    school: SchoolIcon,
    work: WorkIcon,
    code: CodeIcon,
    person: PersonIcon,
    build: BuildIcon,
    contact: ContactMailIcon,
    home: HomeIcon,
    folder: FolderIcon,
    // Skill-category glyphs. All monochrome MUI icons so the five panel headers
    // read as one set and inherit the palette (no OS emoji, no ASCII).
    terminal: TerminalIcon,
    layers: LayersIcon,
    cloud: CloudIcon,
    psychology: PsychologyIcon,
    handyman: HandymanIcon,
    // Contact channels. A new channel is a content file plus one line here —
    // no component change.
    github: GitHubIcon,
    linkedin: LinkedInIcon,
    email: EmailIcon,
    link: OpenInNewIcon,
};

export function SectionIcon({
    name,
    fallback = 'folder',
    ...props
}: { name: string; fallback?: string } & SvgIconProps) {
    const Cmp = REGISTRY[name] ?? REGISTRY[fallback] ?? FolderIcon;
    return <Cmp {...props} />;
}
