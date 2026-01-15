import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "@/env";
import * as schema from "./schema";

const pool = new pg.Pool({ 
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // easiest for dev
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
