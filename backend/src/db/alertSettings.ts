import { pool } from "./client.js";
import type { CryptoSymbol } from "../types.js";

/**
 * ユーザの全銘柄のターゲット価格アラート設定をDBから読み込むメソッド
 */
export async function loadTargetAlerts(userId: number) {
  const result = await pool.query(
    `SELECT symbol, target_high, target_low, auto_reset
       FROM target_price_alerts
       WHERE user_id = $1`,
    [userId],
  );
  return result.rows as {
    symbol: CryptoSymbol;
    target_high: number | null;
    target_low: number | null;
    auto_reset: boolean;
  }[];
}

/**
 * ターゲット価格アラート設定を保存するupsertメソッド
 */
export async function upsertTargetAlert(
  userId: number,
  symbol: CryptoSymbol,
  targetHigh: number | null,
  targetLow: number | null,
  autoReset: boolean,
) {
  await pool.query(
    `INSERT INTO target_price_alerts (user_id, symbol, target_high, target_low, auto_reset, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, symbol)
       DO UPDATE SET target_high = $3, target_low = $4, auto_reset = $5, updated_at = NOW()`,
    [userId, symbol, targetHigh, targetLow, autoReset],
  );
}

/**
 * ユーザの全銘柄のボラティリティアラート設定をDBから読み込むメソッド
 */
export async function loadVolatilitySettings(userId: number) {
  const result = await pool.query(
    `SELECT symbol, window_sec, threshold
       FROM volatility_alert_settings
       WHERE user_id = $1`,
    [userId],
  );
  return result.rows as {
    symbol: CryptoSymbol;
    window_sec: number;
    threshold: number;
  }[];
}

/**
 * ボラティリティアラート設定を保存するupsertメソッド
 */
export async function upsertVolatilitySetting(
  userId: number,
  symbol: CryptoSymbol,
  windowSec: number,
  threshold: number,
) {
  await pool.query(
    `INSERT INTO volatility_alert_settings (user_id, symbol, window_sec, threshold, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, symbol)
       DO UPDATE SET window_sec = $3, threshold = $4, updated_at = NOW()`,
    [userId, symbol, windowSec, threshold],
  );
}
