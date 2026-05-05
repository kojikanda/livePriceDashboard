import { pool } from "./client.js";
import type { CryptoSymbol, PortfolioRow } from "../types.js";

/**
 * 指定ユーザのポジションを全件取得する
 * @param userId ユーザID
 * @returns ポジションの配列
 */
export async function loadPositions(userId: number): Promise<PortfolioRow[]> {
  const result = await pool.query(
    `SELECT id, symbol, direction, invested_jpy, entry_price_usd, usd_jpy_rate, coin_amount                                    
       FROM portfolio_positions                                                                                                    
       WHERE user_id = $1
       ORDER BY created_at ASC`,
    [userId],
  );

  return result.rows.map((r) => ({
    id: r.id,
    symbol: r.symbol as CryptoSymbol,
    direction: r.direction as "long" | "short",
    investedJpy: Number(r.invested_jpy),
    entryPriceUsd: Number(r.entry_price_usd),
    usdJpyRate: Number(r.usd_jpy_rate),
    coinAmount: Number(r.coin_amount),
    // 以下はバックエンドの処理で計算するため、DBからはnullで返す
    currentValueJpy: null,
    profitLoss: null,
    profitLossRate: null,
  }));
}

/**
 * ポジションを1件挿入する。挿入後のIDを返す
 * @param userId ユーザID
 * @param symbol 銘柄
 * @param direction ロング or ショート
 * @param investedJpy 投資金額（円）
 * @param entryPriceUsd 購入時の価格（USD）
 * @param usdJpyRate 購入時のUSD/JPYレート
 * @param coinAmount 保有数量
 * @returns 挿入されたポジションのID
 */
export async function insertPosition(
  userId: number,
  symbol: CryptoSymbol,
  direction: "long" | "short",
  investedJpy: number,
  entryPriceUsd: number,
  usdJpyRate: number,
  coinAmount: number,
): Promise<string> {
  const result = await pool.query(
    `INSERT INTO portfolio_positions
         (user_id, symbol, direction, invested_jpy, entry_price_usd, usd_jpy_rate, coin_amount)                                    
       VALUES ($1, $2, $3, $4, $5, $6, $7)                                                                                         
       RETURNING id`,
    [
      userId,
      symbol,
      direction,
      investedJpy,
      entryPriceUsd,
      usdJpyRate,
      coinAmount,
    ],
  );
  return result.rows[0].id as string;
}

/**
 * 指定IDのポジションを1件削除する
 * @param userId ユーザID
 * @param positionId ポジションID
 */
export async function deletePosition(
  userId: number,
  positionId: string,
): Promise<void> {
  await pool.query(
    `DELETE FROM portfolio_positions WHERE id = $1 AND user_id = $2`,
    [positionId, userId],
  );
}

/**
 * 指定ユーザのポジションを全件削除する
 * @param userId ユーザID
 */
export async function clearPositions(userId: number): Promise<void> {
  await pool.query(`DELETE FROM portfolio_positions WHERE user_id = $1`, [
    userId,
  ]);
}
