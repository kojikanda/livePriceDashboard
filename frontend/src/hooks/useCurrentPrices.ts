import { useDashboard } from "./useDashboard";
import type { CryptoSymbol } from "../types/price";

/**
 * 現在価格取得用カスタムフック
 * @returns 現在価格取得用カスタムフック
 */
export function useCurrentPrices(): Record<CryptoSymbol, number | null> {
  const { payload } = useDashboard();
  return {
    BTC: payload?.BTC?.currentPrice ?? null,
    ETH: payload?.ETH?.currentPrice ?? null,
    SOL: payload?.SOL?.currentPrice ?? null,
  };
}
