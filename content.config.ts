import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page',
      source: 'blog/*.md',
      schema: z.object({
        title: z.string(),
        date: z.string(),
        description: z.string()
      })
    }),
    manual: defineCollection({
      type: 'page',
      source: 'manual/*.md',
      schema: z.object({
        title: z.string(),
        order: z.number(),
        icon: z.string().optional(),
        description: z.string().optional()
      })
    })
  }
})
