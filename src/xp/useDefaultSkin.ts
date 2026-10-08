'use client';

import { useEffect } from 'react';
import { useThemeContext } from '@/theme/ThemeProvider';
import { DEFAULT_SKIN } from '@/skins/registry';

/**
 * The redesigned pages have no skin picker, but a returning visitor may still
 * carry a stored skin from the old home page — and some skins pin the
 * appearance, which would leave the light/dark switch inert. Drop back to the
 * default skin so the visitor's light/dark choice is always honoured.
 */
export function useDefaultSkin() {
    const { skin, setSkin } = useThemeContext();
    useEffect(() => {
        if (skin !== DEFAULT_SKIN) setSkin(DEFAULT_SKIN);
    }, [skin, setSkin]);
}
