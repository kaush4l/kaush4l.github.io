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

const REGISTRY: Record<string, ComponentType<SvgIconProps>> = {
    school: SchoolIcon,
    work: WorkIcon,
    code: CodeIcon,
    person: PersonIcon,
    build: BuildIcon,
    contact: ContactMailIcon,
    home: HomeIcon,
    folder: FolderIcon,
};

export function SectionIcon({ name, ...props }: { name: string } & SvgIconProps) {
    const Cmp = REGISTRY[name] ?? FolderIcon;
    return <Cmp {...props} />;
}
