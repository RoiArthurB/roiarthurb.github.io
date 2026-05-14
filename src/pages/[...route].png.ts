import type { APIRoute } from "astro";
import { resolve } from "node:path";
import { getCollection } from "astro:content";
import { generateOgImage, type OgOptions } from "../utils/generateOgImage";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";
import projectsData from "../data/projects.json";

function resolveProjectImage(imagePath: string): string {
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
    return resolve(process.cwd(), imagePath.replace(/^\//, ''));
}

function resolveBlogHeroImage(src: string): string | undefined {
    if (src.startsWith('/@fs/')) return src.slice(4);
    if (src.startsWith('/')) return resolve(process.cwd(), src.slice(1));
    return undefined;
}

export async function getStaticPaths() {
    const posts = await getCollection('blog');

    // Base static pages
    const staticPages = [
        { params: { route: 'og' }, props: { title: SITE_TITLE, subtitle: 'EXPLORE', author: SITE_TITLE } },
        { params: { route: 'about' }, props: { title: 'About', subtitle: 'EXPLORE', author: SITE_TITLE } },
        { params: { route: 'projects' }, props: { title: 'Projects', subtitle: 'EXPLORE', author: SITE_TITLE, icon: 'flask' } },
        { params: { route: 'publications' }, props: { title: 'Publications', subtitle: 'EXPLORE', author: SITE_TITLE, icon: 'book' } },
        { params: { route: 'software' }, props: { title: 'Software', subtitle: 'EXPLORE', author: SITE_TITLE, icon: 'code' } },
        { params: { route: 'team' }, props: { title: 'Team', subtitle: 'EXPLORE', author: SITE_TITLE } },
        { params: { route: 'blog' }, props: { title: 'Blog', subtitle: 'EXPLORE', author: SITE_TITLE, icon: 'book' } },
    ];

    // Dynamic blog posts
    const blogPages = posts.map((post) => ({
        params: { route: `blog/${post.id}` },
        props: {
            title: post.data.title,
            subtitle: 'Blog Post',
            author: SITE_TITLE,
            icon: 'book',
            bgImage: post.data.heroImage ? resolveBlogHeroImage(post.data.heroImage.src) : undefined,
        },
    }));

    const projectPages = (projectsData as any[]).map((project) => ({
        params: { route: `projects/${project.id}` },
        props: {
            title: project.ogLabel ?? project.title,
            subtitle: 'Research Project',
            author: SITE_TITLE,
            icon: 'flask',
            bgImage: project.heroImage ? resolveProjectImage(project.heroImage) : undefined,
        },
    }));

    return [...staticPages, ...blogPages, ...projectPages];
}

export const GET: APIRoute = async ({ props }) => {
    const safeTitle = (props.title as string).replace(/&/g, 'and');
    return new Response(
        await generateOgImage(safeTitle, props.subtitle as string, {
            tagline: props.tagline as string | undefined,
            author: props.author as string | undefined,
            icon: props.icon as OgOptions['icon'],
            bgImage: props.bgImage as string | undefined,
        }),
        { headers: { "Content-Type": "image/png" } }
    );
};
