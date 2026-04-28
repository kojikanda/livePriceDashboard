import { useEffect, useState } from "react";
import { socket } from "../lib/socket";
import type { CryptoSymbol, PricePayload } from "../types/price";

type CurrentPrices = Record<CryptoSymbol, number | null>;

/**
 * 現在価格取得用カスタムフック
 * @returns 現在価格取得用カスタムフック
 */
export function useCurrentPrices(): CurrentPrices {
  const [prices, setPrices] = useState<CurrentPrices>({
    BTC: null,
    ETH: null,
    SOL: null,
  });

  useEffect(() => {
    const handler = (data: PricePayload) => {
      setPrices({ BTC: data.BTC, ETH: data.ETH, SOL: data.SOL });
    };
    socket.on("priceUpdate", handler);
    return () => {
      socket.off("priceUpdate", handler);
    };
  }, []);

  return prices;
}
