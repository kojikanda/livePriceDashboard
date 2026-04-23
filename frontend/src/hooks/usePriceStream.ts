import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import type {
  PriceData,
  PriceStreamOptions,
  PricePayload,
} from "../types/price";

const socket = io("http://localhost:3001");

// ボラティリティアラートの判定で使用する算出結果、及び、変化率算出で使用した設定値を保持する型
type ChangePercentState = {
  value: number;
  windowSec: number;
  threshold: number;
} | null;

// ボラティリティアラート発生判定履歴の型
type VolatilityHistory = { timestamp: number; price: number };

/**
 * ボラティリティアラート発生判定履歴からウィンドウ外の情報を削除する
 * @param history ボラティリティアラート発生判定履歴配列
 * @param now 現在時刻
 * @param windowMs ウィンドウ(ミリ秒)
 */
function removeDataOutsideWindow(
  history: VolatilityHistory[],
  now: number,
  windowMs: number,
) {
  // console.log(
  //   `[removeDataOutsideWindow] now=${new Date(now).toLocaleString()}`,
  // );
  while (history.length > 1 && now - history[1]!.timestamp > windowMs) {
    // console.log(
    //   `[removeDataOutsideWindow] delete data time=${new Date(history[0]!.timestamp).toLocaleString()}`,
    // );
    history.shift();
  }
}

/**
 * 価格データ取得用カスタムフック
 * @param symbol 銘柄のシンボル
 * @param maxHistory 価格データの最大保持件数
 * @param volatilityWindowSec ボラティリティアラート監視ウィンドウ(秒)
 * @param volatilityThreshold ボラティリティアラート閾値(%)
 * @returns 価格データ取得用カスタムフック
 */
export function usePriceStream({
  symbol,
  maxHistory,
  volatilityWindowSec,
  volatilityThreshold,
}: PriceStreamOptions) {
  // 価格
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  // 価格の履歴
  const [history, setHistory] = useState<PriceData[]>([]);
  // ボラティリティアラートの判定で使用する算出結果、及び、算出で使用した設定値
  const [changePercentState, setChangePercentState] =
    useState<ChangePercentState>(null);
  // ボラティリティアラート発生有無
  const [showVolatilityAlert, setShowVolatilityAlert] = useState(false);
  // ボラティリティアラート発生判定履歴
  const volatilityHistoryRef = useRef<VolatilityHistory[]>([]);
  // ボラティリティアラート監視ウィンドウ
  const windowSecRef = useRef(volatilityWindowSec);
  // ボラティリティアラート閾値
  const thresholdRef = useRef(volatilityThreshold);
  // 価格データの最大保持件数
  // サーバからのデータ受信イベントのクロージャ内で値を使用するため、
  // refを使用することで、値が変化したときにも対応できるようにする
  const maxHistoryRef = useRef(maxHistory);

  // 現在の設定値で計算されたものだけを表示（不一致ならnull）
  const changePercent =
    changePercentState !== null &&
    changePercentState.windowSec === volatilityWindowSec
      ? changePercentState.value
      : null;

  // 設定値が変わったらときの処理
  useEffect(() => {
    const now = Date.now();
    const newWindowMs = volatilityWindowSec * 1000;

    // ウィンドウが変わったときだけ、新しいウィンドウより古いエントリを削除
    // 閾値だけが変わったときは何もしない
    if (windowSecRef.current !== volatilityWindowSec) {
      const vHistory = volatilityHistoryRef.current;
      removeDataOutsideWindow(vHistory, now, newWindowMs);
    }

    windowSecRef.current = volatilityWindowSec;
    thresholdRef.current = volatilityThreshold;
  }, [volatilityWindowSec, volatilityThreshold]);

  // maxHistoryRefの値を最新の値で更新
  useEffect(() => {
    maxHistoryRef.current = maxHistory;
  }, [maxHistory]);

  // socketイベントの登録・解除（設定値の変更には反応しない）
  useEffect(() => {
    // WebSocketでやり取りするイベント名
    const eventName = `${symbol.toLowerCase()}Price`;

    // WebSocketでデータを受信したときのイベント処理を追加
    socket.on(eventName, (data: PricePayload) => {
      const now = Date.now();
      const windowMs = windowSecRef.current * 1000;

      // 現在の価格をstateに設定
      const entry: PriceData = {
        time: new Date().toLocaleTimeString(),
        price: data.price,
        timestamp: now,
      };
      setCurrentPrice(data.price);
      setHistory((prev) => [...prev, entry].slice(-maxHistoryRef.current));

      // ボラティリティアラートで使用する値を設定
      const vHistory = volatilityHistoryRef.current;
      vHistory.push({ timestamp: now, price: data.price });
      // 監視ウィンドウから外れる値は削除
      removeDataOutsideWindow(vHistory, now, windowMs);

      // ボラティリティアラート判定処理
      if (vHistory.length >= 2) {
        const oldestEntry = vHistory[0]!;
        const elapsedSec = (now - oldestEntry.timestamp) / 1000;
        // 誤差を考慮し、監視ウィンドウの90%以上でアラート判定を行う
        if (elapsedSec >= windowSecRef.current * 0.9) {
          // 変化率算出
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

    // 切断が切れたときはイベントを解除
    return () => {
      socket.off(eventName);
    };
  }, [symbol]);

  return {
    currentPrice,
    history: history.slice(-maxHistory),
    changePercent,
    showVolatilityAlert,
    setShowVolatilityAlert,
  };
}
