import { useState, useEffect } from "react";
import { useDashboard } from "./useDashboard";
import type { CryptoSymbol } from "../types/price";

type Props = {
  symbol: CryptoSymbol;
  volatilityThreshold: number;
};

/**
 * 価格データ取得用カスタムフック
 * @param symbol 銘柄のシンボル
 * @param volatilityThreshold ボラティリティアラート閾値(%)
 * @returns 価格データ取得用カスタムフック
 */
export function usePriceStream({ symbol, volatilityThreshold }: Props) {
  const { payload } = useDashboard();
  const symbolData = payload?.[symbol] ?? null;
  const [showVolatilityAlert, setShowVolatilityAlert] = useState(false);

  // ボラティリティアラートの検知判定
  useEffect(() => {
    const pct = symbolData?.changePercent;
    if (pct == null) return;
    if (Math.abs(pct) >= volatilityThreshold) {
      setShowVolatilityAlert(true);
    }
  }, [symbolData?.changePercent, volatilityThreshold]);

  return {
    currentPrice: symbolData?.currentPrice ?? null,
    priceHistory: symbolData?.priceHistory ?? [],
    sentimentResults: symbolData?.sentimentResults ?? null,
    priceChanges: symbolData?.priceChanges ?? [],
    volatilityScore: symbolData?.volatilityScore ?? null,
    changePercent: symbolData?.changePercent ?? null,
    showVolatilityAlert,
    setShowVolatilityAlert,
  };
}
