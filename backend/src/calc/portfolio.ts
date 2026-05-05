import {
  loadPositions,
  insertPosition,
  deletePosition,
  clearPositions,
} from "../db/portfolio.js";
import type { CryptoSymbol, PortfolioRow } from "../types.js";

// socketId → PortfolioRow[] のマップ
const portfolioStates = new Map<
  string,
  { userId: number; rows: PortfolioRow[] }
>();

/**
 * DB からポジションを読み込んでMapを初期化する（接続時に呼ぶ）
 * @param socketId ソケットID
 * @param userId ユーザID
 * @returns Promise
 */
export async function initPortfolioState(
  socketId: string,
  userId: number,
): Promise<void> {
  const rows = await loadPositions(userId);
  portfolioStates.set(socketId, { userId, rows });
}

/**
 * ポジションを追加する（仮想購入時）
 * @param socketId ソケットID
 * @param symbol 銘柄
 * @param direction ロング or ショート
 * @param investedJpy 投資金額（円）
 * @param entryPriceUsd 購入時の価格（USD）
 * @param usdJpyRate 購入時のUSD/JPYレート
 * @param coinAmount 保有数量
 * @returns Promise
 */
export async function addPosition(
  socketId: string,
  symbol: CryptoSymbol,
  direction: "long" | "short",
  investedJpy: number,
  entryPriceUsd: number,
  usdJpyRate: number,
  coinAmount: number,
): Promise<void> {
  const state = portfolioStates.get(socketId);
  if (!state) return;

  // DB に挿入して UUID を取得する
  const id = await insertPosition(
    state.userId,
    symbol,
    direction,
    investedJpy,
    entryPriceUsd,
    usdJpyRate,
    coinAmount,
  );

  // portfolioStatesにも追加する
  state.rows.push({
    id,
    symbol,
    direction,
    investedJpy,
    entryPriceUsd,
    usdJpyRate,
    coinAmount,
    currentValueJpy: null,
    profitLoss: null,
    profitLossRate: null,
  });
}

/**
 * ポジションを1件削除する（決済時）
 * @param socketId ソケットID
 * @param positionId ポジションID
 * @returns Promise
 */
export async function removePosition(
  socketId: string,
  positionId: string,
): Promise<void> {
  const state = portfolioStates.get(socketId);
  if (!state) return;

  await deletePosition(state.userId, positionId);
  state.rows = state.rows.filter((r) => r.id !== positionId);
}

/**
 * 全ポジションを削除する（全決済時）
 * @param socketId ソケットID
 * @returns Promise
 */
export async function clearPortfolio(socketId: string): Promise<void> {
  const state = portfolioStates.get(socketId);
  if (!state) return;

  await clearPositions(state.userId);
  state.rows = [];
}

/**
 * 切断時に Map からエントリを削除する
 * @param socketId ソケットID
 */
export function removePortfolioState(socketId: string): void {
  portfolioStates.delete(socketId);
}

/**
 * 現在価格を使って損益を計算したポートフォリオデータを返す
 * @param socketId ソケットID
 * @param currentPrices 銘柄ごとの現在価格のマップ
 * @returns 損益計算済みのポートフォリオデータ
 */
export function calcPortfolioRows(
  socketId: string,
  currentPrices: Partial<Record<CryptoSymbol, number>>,
): PortfolioRow[] {
  const state = portfolioStates.get(socketId);
  if (!state) return [];

  return state.rows.map((p) => {
    const price = currentPrices[p.symbol] ?? null;

    const currentValueJpy =
      price !== null ? p.coinAmount * price * p.usdJpyRate : null;

    const profitLoss =
      price !== null
        ? p.direction === "long"
          ? (price - p.entryPriceUsd) * p.coinAmount * p.usdJpyRate
          : (p.entryPriceUsd - price) * p.coinAmount * p.usdJpyRate
        : null;

    const profitLossRate =
      profitLoss !== null ? (profitLoss / p.investedJpy) * 100 : null;

    return { ...p, currentValueJpy, profitLoss, profitLossRate };
  });
}
