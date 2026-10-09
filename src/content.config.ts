import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const services = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/services' }),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    icon: z.string(),
    heroImage: z.string(),
    order: z.number().default(0),
  }),
});

const members = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/members' }),
  schema: z.object({
    name: z.string(),
    position: z.string(),
    description: z.string(),
    image: z.string(),
    heroImage: z.string(),
    linkedinUser: z.string().optional(),
    xUser: z.string().optional(),
    instagramUser: z.string().optional(),
    order: z.number().default(0),
  }),
});

const blogs = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/blogs' }),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    image: z.string(),
    content: z.string(),
    order: z.number().default(0),
  }),
});

export const collections = { services, members, blogs };
