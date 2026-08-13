/**
 * Deterministic per-entry color palette for the generated OG/hero images.
 *
 * A seed (post slug, project id) hashes to a hue, so every article keeps its own
 * stable color across builds. Seedless callers get the site's amber brand back.
 */

export interface OgPalette {
    base: string;       // page background — near-black, faintly tinted
    blob1: string;      // top-right decorative gradient
    blob2: string;      // bottom-left decorative gradient
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
    blob1: 'linear-gradient(135deg, rgba(255, 171, 0, 0.35), rgba(255, 171, 0, 0))',
    blob2: 'linear-gradient(45deg, rgba(196, 127, 0, 0.25), rgba(196, 127, 0, 0))',
    overlay: 'rgba(0, 0, 0, 0.65)',
};

export function ogPalette(seed?: string): OgPalette {
    if (!seed) return AMBER;

    const hue = fnv1a(seed) % 360;
    const primary = hslToRgbParts(hue, 85, 55);
    const secondary = hslToRgbParts(hue + 25, 85, 42);

    return {
        base: `rgb(${hslToRgbParts(hue, 15, 8)})`,
        blob1: `linear-gradient(135deg, rgba(${primary}, 0.35), rgba(${primary}, 0))`,
        blob2: `linear-gradient(45deg, rgba(${secondary}, 0.25), rgba(${secondary}, 0))`,
        overlay: `rgba(${hslToRgbParts(hue, 25, 6)}, 0.65)`,
    };
}
