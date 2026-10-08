import type { XpThemeProps } from '../types';
import Serp from './google/Serp';
import './google.css';

/**
 * Google-style results page. The server side only hands the md config and the
 * normalised résumé to the client SERP, which owns search, tabs and accordions.
 */
export default function GoogleTheme({ config, resume }: XpThemeProps) {
    return <Serp config={config} resume={resume} />;
}
