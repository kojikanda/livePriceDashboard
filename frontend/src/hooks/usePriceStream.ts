import { useDashboard } from "./useDashboard";
import type { CryptoSymbol } from "../types/price";

type Props = {
  symbol: CryptoSymbol;
};

/**
 * 価格データ取得用カスタムフック
 * @param symbol 銘柄のシンボル
 * @returns 価格データ取得用カスタムフック
 */
export function usePriceStream({ symbol }: Props) {
  const { payload } = useDashboard();
  const symbolData = payload?.[symbol] ?? null;

  return {
    currentPrice: symbolData?.currentPrice ?? null,
    priceHistory: symbolData?.priceHistory ?? [],
    sentimentResults: symbolData?.sentimentResults ?? null,
    priceChanges: symbolData?.priceChanges ?? [],
    volatilityScore: symbolData?.volatilityScore ?? null,
    changePercent: symbolData?.changePercent ?? null,
  };
}
