import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import type {
  PriceData,
  PriceStreamOptions,
  PricePayload,
} from "../types/price";

const socket = io("http://localhost:3001");

type ChangePercentState = {
  value: number;
  windowSec: number;
  threshold: number;
} | null;

/**
 * 価格データ取得用カスタムフック
 * @param symbol 銘柄のシンボル
 * @param maxHistory 価格データの最大保持件数
 * @param volatilityWindowSec ボラティリティ監視ウィンドウ(秒)
 * @param volatilityThreshold ボラティリティアラート閾値(%)
 * @returns
 */

export function usePriceStream({
  symbol,
  maxHistory,
  volatilityWindowSec,
  volatilityThreshold,
}: PriceStreamOptions) {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [history, setHistory] = useState<PriceData[]>([]);
  const [changePercentState, setChangePercentState] =
    useState<ChangePercentState>(null);
  const [showVolatilityAlert, setShowVolatilityAlert] = useState(false);

  const volatilityHistoryRef = useRef<{ timestamp: number; price: number }[]>(
    [],
  );
  const windowSecRef = useRef(volatilityWindowSec);
  const thresholdRef = useRef(volatilityThreshold);

  // 現在の設定値で計算されたものだけを表示（不一致ならnull）
  const changePercent =
    changePercentState !== null &&
    changePercentState.windowSec === volatilityWindowSec &&
    changePercentState.threshold === volatilityThreshold
      ? changePercentState.value
      : null;

  // 設定値が変わったらrefを更新し、履歴をリセット
  useEffect(() => {
    windowSecRef.current = volatilityWindowSec;
    thresholdRef.current = volatilityThreshold;
    volatilityHistoryRef.current = [];
  }, [volatilityWindowSec, volatilityThreshold]);

  // socketイベントの登録・解除（設定値の変更には反応しない）
  useEffect(() => {
    const eventName = `${symbol.toLowerCase()}Price`;

    socket.on(eventName, (data: PricePayload) => {
      const now = Date.now();
      const windowMs = windowSecRef.current * 1000;

      const entry: PriceData = {
        time: new Date().toLocaleTimeString(),
        price: data.price,
        timestamp: now,
      };
      setCurrentPrice(data.price);
      setHistory((prev) => [...prev, entry].slice(-maxHistory));

      const vHistory = volatilityHistoryRef.current;
      vHistory.push({ timestamp: now, price: data.price });
      while (vHistory.length > 0 && now - vHistory[0]!.timestamp > windowMs) {
        vHistory.shift();
      }

      if (vHistory.length >= 2) {
        const oldestEntry = vHistory[0]!;
        const elapsedSec = (now - oldestEntry.timestamp) / 1000;
        if (elapsedSec >= windowSecRef.current * 0.9) {
          const pct =
            ((data.price - oldestEntry.price) / oldestEntry.price) * 100;
          // 計算時の設定値もセットで保存
          setChangePercentState({
            value: pct,
            windowSec: windowSecRef.current,
            threshold: thresholdRef.current,
          });
          if (Math.abs(pct) > thresholdRef.current) {
            setShowVolatilityAlert(true);
          }
        }
      }
    });

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
