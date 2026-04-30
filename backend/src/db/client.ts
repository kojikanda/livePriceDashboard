import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

/**
 * データベース接続のためのコネクションプール
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
