import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import type { PriceData, PriceStreamOptions } from "../types/price";

const socket = io("http://localhost:3001");

/**
 * 価格取得用カスタムフック
 * @param symbol 銘柄のシンボル
 * @param maxHistory 価格データの最大保持件数
 * @returns
 */
export function usePriceStream({ symbol, maxHistory }: PriceStreamOptions) {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [history, setHistory] = useState<PriceData[]>([]);

  useEffect(() => {
    // WebSocketでやり取りするイベント名
    const eventName = `${symbol.toLowerCase()}Price`;

    // WebSocketで価格を受信したときのイベント処理を追加
    socket.on(eventName, (data: { price: number }) => {
      const entry: PriceData = {
        time: new Date().toLocaleTimeString(),
        price: data.price,
      };
      setCurrentPrice(data.price);
      setHistory((prev) => [...prev, entry].slice(-maxHistory));
    });

    // 切断が切れたときはイベントを解除
    return () => {
      socket.off(eventName);
    };
  }, [symbol, maxHistory]);

  return { currentPrice, history };
}
