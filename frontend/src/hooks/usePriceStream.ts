import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import type {
  PriceData,
  PriceStreamOptions,
  PricePayload,
} from "../types/price";

const socket = io("http://localhost:3001");

/**
 * 価格データ取得用カスタムフック
 * @param symbol 銘柄のシンボル
 * @param maxHistory 価格データの最大保持件数
 * @returns
 */
export function usePriceStream({ symbol, maxHistory }: PriceStreamOptions) {
  // 現在の価格
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  // 価格の履歴情報
  const [history, setHistory] = useState<PriceData[]>([]);
  // 価格の変動率
  const [changePercent, setChangePercent] = useState<number | null>(null);
  // ボラティリティアラート発生有無
  const [showVolatilityAlert, setShowVolatilityAlert] = useState(false);

  useEffect(() => {
    // WebSocketでやり取りするイベント名
    const eventName = `${symbol.toLowerCase()}Price`;

    // WebSocketでデータを受信したときのイベント処理を追加
    socket.on(eventName, (data: PricePayload) => {
      const entry: PriceData = {
        time: new Date().toLocaleTimeString(),
        price: data.price,
      };
      setCurrentPrice(data.price);
      setHistory((prev) => [...prev, entry].slice(-maxHistory));
      setChangePercent(data.changePercent);
      if (data.volatilityAlert) {
        setShowVolatilityAlert(true);
      }
    });

    // 切断が切れたときはイベントを解除
    return () => {
      socket.off(eventName);
    };
  }, [symbol, maxHistory]);

  return {
    currentPrice,
    history,
    changePercent,
    showVolatilityAlert,
    setShowVolatilityAlert,
  };
}
