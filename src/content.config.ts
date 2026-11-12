import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const category = z.enum([
  'languages-runtimes',
  'package-management',
  'frontend',
  'styling-ui',
  'build-quality',
  'testing',
  'backend-apis',
  'auth',
  'data',
  'ai-dev',
  'analytics',
  'observability',
  'ci-cd',
  'security',
  'deployment',
  'iac-platform',
]);

const maturity = z.enum(['frontier', 'stable', 'legacy', 'deprecated']);

const tools = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/tools' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().max(200),
    category,
    maturity,
    radar: z.enum(['adopt', 'trial', 'assess', 'hold']),
    toolVersion: z.string(),
    verifiedAt: z.coerce.date(),
    needsVerification: z.boolean().default(false),
    officialDocs: z.url(),
    repo: z.url().optional(),
    license: z.string(),
    pricing: z.enum(['oss', 'free-tier', 'paid', 'mixed']),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    alternatives: z.array(z.string()).default([]),
    related: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().max(200),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const blueprints = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blueprints' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().max(200),
    tools: z.array(z.string()).default([]),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    draft: z.boolean().default(false),
  }),
});

const radar = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/radar' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().max(200),
    status: z.enum(['adopt', 'trial', 'assess', 'hold']),
    tools: z.array(z.string()).default([]),
    verifiedAt: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().max(200),
    publishedAt: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { tools, guides, blueprints, radar, posts };
