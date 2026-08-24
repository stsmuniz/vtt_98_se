const { defineConfig } = require('drizzle-kit')

module.exports = defineConfig({
  out: './drizzle',
  schema: './server/db/schema.cjs',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:./sqlite.db',
  },
})
