/**
 * Deterministic per-entry color palette for the generated OG/hero images.
 *
 * A seed (post slug, project id) hashes to a hue, so every article keeps its own
 * stable color across builds. Seedless callers get the site's amber brand back.
 */

export interface OgBlob {
    gradient: string;   // linear-gradient(...) fill
    size: number;       // diameter in px
    position: string;   // CSS edge offsets, e.g. 'top: -150px; right: -50px;'
}

export interface OgPalette {
    base: string;       // page background — near-black, faintly tinted
    blobs: OgBlob[];    // decorative circles, one hanging off the top edge and one off the bottom
    overlay: string;    // scrim laid over a background photo
}

/** 32-bit FNV-1a — small, dependency-free, stable across Node versions. */
function fnv1a(value: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

/** mulberry32 — pulls a stream of independent values out of one 32-bit seed. */
function mulberry32(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** h in degrees, s/l in percent — returned as `r, g, b` ready to drop into rgba(). */
function hslToRgbParts(h: number, s: number, l: number): string {
    const hue = ((h % 360) + 360) % 360;
    const sat = s / 100;
    const lig = l / 100;
    const c = (1 - Math.abs(2 * lig - 1)) * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = lig - c / 2;
    const [r1, g1, b1] =
        hue < 60 ? [c, x, 0] :
        hue < 120 ? [x, c, 0] :
        hue < 180 ? [0, c, x] :
        hue < 240 ? [0, x, c] :
        hue < 300 ? [x, 0, c] :
        [c, 0, x];
    return [r1, g1, b1].map((v) => Math.round((v + m) * 255)).join(', ');
}

const AMBER: OgPalette = {
    base: '#1f1f1e',
    blobs: [
        {
            gradient: 'linear-gradient(135deg, rgba(255, 171, 0, 0.35), rgba(255, 171, 0, 0))',
            size: 600,
            position: 'top: -150px; right: -50px;',
        },
        {
            gradient: 'linear-gradient(45deg, rgba(196, 127, 0, 0.25), rgba(196, 127, 0, 0))',
            size: 600,
            position: 'bottom: -150px; left: -50px;',
        },
    ],
    overlay: 'rgba(0, 0, 0, 0.65)',
};

const SIZE = [520, 720];        // small enough reads as a dot, large enough swamps the card
const VERTICAL = [-260, -90];   // keeps the circle hanging off the edge, never floating mid-card
const HORIZONTAL = [-160, 40];  // can tuck in or hang further out

export function ogPalette(seed?: string): OgPalette {
    if (!seed) return AMBER;

    const hash = fnv1a(seed);
    const hue = hash % 360;
    const rand = mulberry32(hash);
    const between = ([min, max]: number[]) => Math.round(min + rand() * (max - min));

    // One blob per horizontal band, so the centered title never sits against a bright mass.
    const blob = (edge: 'top' | 'bottom', color: string, alpha: number): OgBlob => ({
        gradient: `linear-gradient(${between([0, 360])}deg, rgba(${color}, ${alpha}), rgba(${color}, 0))`,
        size: between(SIZE),
        position: `${edge}: ${between(VERTICAL)}px; ${rand() < 0.5 ? 'left' : 'right'}: ${between(HORIZONTAL)}px;`,
    });

    return {
        base: `rgb(${hslToRgbParts(hue, 15, 8)})`,
        blobs: [
            blob('top', hslToRgbParts(hue, 85, 55), 0.35),
            blob('bottom', hslToRgbParts(hue + 25, 85, 42), 0.25),
        ],
        overlay: `rgba(${hslToRgbParts(hue, 25, 6)}, 0.65)`,
    };
}
