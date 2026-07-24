import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

type SchemaContext = { image: () => any };

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }: SchemaContext) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().optional(),
			authors: z.array(z.string()).optional(), // References 'id' in authors.json
			toc: z.boolean().optional(),
			comments: z.boolean().optional(),
			tags: z.array(z.string()).optional(),
			publish: z.boolean().optional(),
		}),
});

const slashes = defineCollection({
	// Low-key "slash pages" (slashpages.net). Source lives here; each renders at the site root.
	loader: glob({ base: './src/content/slashes', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		lede: z.string().optional(),
		updatedDate: z.coerce.date().optional(),
	}),
});

export const collections = { blog, slashes };
