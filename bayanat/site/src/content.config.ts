import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Content lives outside the site, in ../content, shared with the Python pipeline.
const pillar = z.enum(['governance', 'llm', 'security', 'regulation']);
const source = z.object({ title: z.string(), url: z.string().url() });

const analysis = z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  pillar,
  status: z.enum(['draft', 'published']).default('published'),
  author: z.string().default('The editor'),
  reading_minutes: z.number().optional(),
  sources: z.array(source).default([]),
  translation: z.string().optional(), // slug of the same analysis in the other language
});

export const collections = {
  analysisEn: defineCollection({ loader: glob({ pattern: '**/*.md', base: '../content/en/analysis' }), schema: analysis }),
  analysisAr: defineCollection({ loader: glob({ pattern: '**/*.md', base: '../content/ar/analysis' }), schema: analysis }),
  brief: defineCollection({
    loader: glob({ pattern: '**/*.md', base: '../content/en/brief' }),
    schema: z.object({
      title: z.string(),
      date: z.coerce.date(),
      pillar: z.enum(['governance', 'llm', 'security', 'regulation', 'off_topic']),
      status: z.enum(['draft', 'approved']),
      source_name: z.string(),
      source_url: z.string(),
      summary: z.string(),
      why_it_matters: z.string().optional().default(''),
      my_take: z.string().optional().default(''),
    }),
  }),
  newsletter: defineCollection({
    loader: glob({ pattern: '**/*.md', base: '../content/newsletter' }),
    schema: z.object({
      title: z.string(),
      issue: z.number(),
      date: z.coerce.date(),
      status: z.enum(['draft', 'sent']).default('draft'),
      editor_note: z.string().optional().default(''),
      one_thing: z.string().optional().default(''),
      items: z.array(z.string()).default([]),
    }),
  }),
};
