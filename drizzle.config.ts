import { defineConfig } from 'drizzle-kit'

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/models/index.ts",
    out: "./drizzle",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
    // Supabase connection settings
    // Note: Use the direct connection string (not pooled) for migrations
    // Get it from: Supabase Dashboard -> Project Settings -> Database -> Connection string -> "Direct connection"
})