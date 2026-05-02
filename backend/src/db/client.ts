import pg from "pg";

const { Pool } = pg;

/**
 * データベース接続のためのコネクションプール
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
