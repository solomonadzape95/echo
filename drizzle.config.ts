import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/models/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    // Render's external Postgres URL requires TLS. Set DATABASE_SSL=true in
    // the Render environment (and for the runtime pool in src/db/db.ts).
    ssl: process.env.DATABASE_SSL === 'true' ? 'require' : undefined,
  },
})
