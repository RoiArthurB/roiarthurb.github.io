import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

async function loadLocalFont(filename: string) {
    const buf = await readFile(resolve(process.cwd(), 'public/fonts/inter', filename));
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export interface OgOptions {
    tagline?: string;   // secondary footer line — hidden if absent
    author?: string;    // primary footer line  — hidden if absent
    icon?: 'book' | 'folder' | 'code' | 'flask';  // bottom-right icon — hidden if absent
    fontSize?: number;  // title font size override — if absent keeps 84px + overflow:hidden + max-height
    bgImage?: string;   // absolute path to a background image — falls back to dark CSS background if absent or unreadable
}

async function encodeImageAsDataUri(source: string): Promise<string | null> {
    try {
        if (source.startsWith('http://') || source.startsWith('https://')) {
            const res = await fetch(source);
            if (!res.ok) return null;
            const buf = Buffer.from(await res.arrayBuffer());
            const mime = (res.headers.get('content-type') ?? 'image/jpeg').split(';')[0].trim();
            return `data:${mime};base64,${buf.toString('base64')}`;
        }
        const data = await readFile(source);
        const ext = source.split('.').pop()?.toLowerCase() ?? 'jpg';
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        return `data:${mime};base64,${data.toString('base64')}`;
    } catch {
        return null;
    }
}

const iconPaths: Record<string, string> = {
    book:   '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>',
    code:   '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>',
    flask:  '<path d="M10 2v8L4.35 19.1a2 2 0 0 0 1.7 2.9h11.9a2 2 0 0 0 1.7-2.9L14 10V2"></path><line x1="8.5" y1="2" x2="15.5" y2="2"></line><line x1="7" y1="14.5" x2="17" y2="14.5"></line>',
};

export async function generateOgImage(title: string, subtitle: string, options: OgOptions = {}) {
    const fontDataRegular = await loadLocalFont('Inter-Regular.ttf');
    const fontDataBold = await loadLocalFont('Inter-Bold.ttf');
    const bgDataUri = options.bgImage ? await encodeImageAsDataUri(options.bgImage) : null;

    const baseFontSize = options.fontSize || (title.length > 40 ? 64 : 84);
    const titleStyle = `font-size: ${baseFontSize}px; flex-wrap: wrap; text-align: center; justify-content: center;`;

    const badgeHtml = subtitle ? `
        <div style="display: flex; justify-content: flex-start; align-items: flex-start; width: 100%;">
            <div style="display: flex; align-items: center; padding: 12px 24px; background-color: rgba(255, 255, 255, 0.1); border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.2);">
                <span style="color: #ffffff; font-size: 24px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                    ${subtitle}
                </span>
            </div>
        </div>
    ` : '';

    const effectiveTagline = options.tagline || (options.author ? 'Academic Portfolio' : '');

    const footerHtml = (options.author || effectiveTagline || options.icon) ? `
        <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${effectiveTagline ? `<span style="color: #94a3b8; font-size: 28px; font-weight: 400;">${effectiveTagline}</span>` : ''}
                ${options.author ? `<span style="color: #cbd5e1; font-size: 32px; font-weight: 700;">${options.author}</span>` : ''}
            </div>
            ${options.icon ? `
                <div style="display: flex; align-items: center; justify-content: center; width: 80px; height: 80px; background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        ${iconPaths[options.icon]}
                    </svg>
                </div>
            ` : ''}
        </div>
    ` : '';

    const markup = html(`
        <div style="background-color: #1f1f1e; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; font-family: 'Inter';">

            ${bgDataUri ? `<img src="${bgDataUri}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" />` : ''}
            ${bgDataUri 
            ? 
                `<div style="display: flex; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.65);"></div>`
            :
                `<div style="display: flex; position: absolute; top: -150px; right: -50px; width: 600px; height: 600px; background-image: linear-gradient(135deg, rgba(255, 171, 0, 0.35), rgba(255, 171, 0, 0)); border-radius: 50%;"></div>
                <div style="display: flex; position: absolute; bottom: -150px; left: -50px; width: 600px; height: 600px; background-image: linear-gradient(45deg, rgba(196, 127, 0, 0.25), rgba(196, 127, 0, 0)); border-radius: 50%;"></div>` 
            }

            <div style="display: flex; flex-direction: column; justify-content: space-between; padding: 80px; width: 100%; height: 100%;">
                ${badgeHtml}

                <div style="display: flex; flex-direction: column; gap: 24px; margin-bottom: 20px; align-items: center;">
                    <div style="display: flex; color: #ffffff; ${titleStyle} font-weight: 700; line-height: 1.1; letter-spacing: -0.02em; margin: 0; max-width: 900px;">
                        ${title}
                    </div>
                </div>

                ${footerHtml}
            </div>
        </div>
    `);

    const svg = await satori(markup, {
        width: 1200,
        height: 630,
        fonts: [
            { name: "Inter", data: fontDataRegular, weight: 400, style: "normal" },
            { name: "Inter", data: fontDataBold, weight: 700, style: "normal" }
        ],
    });

    const resvg = new Resvg(svg);
    const pngData = resvg.render();
    const compressed = await sharp(pngData.asPng())
        .png({ compressionLevel: 9, effort: 10 })
        .toBuffer();
    return new Uint8Array(compressed);
}
