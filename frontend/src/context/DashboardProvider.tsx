import { useState, useEffect, useRef, type ReactNode } from "react";
import { socket } from "../lib/socket";
import { DashboardContext } from "./DashboardContext";
import type {
  DashboardPayload,
  AlertSettingsPayload,
  TargetAlertInfo,
  CryptoSymbol,
} from "../types/price";

const SYMBOLS: CryptoSymbol[] = ["BTC", "ETH", "SOL"];

/**
 * ダッシュボード全体のデータを管理するプロバイダコンポーネント
 * @param children このプロバイダでラップされた子コンポーネント
 * @returns ダッシュボード全体のデータを提供するコンテキストプロバイダコンポーネント
 */
export function DashboardProvider({ children }: { children: ReactNode }) {
  // バックエンドから受信した全銘柄分のデータ
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  // 接続時にDBから読み込んだ設定の初期値
  const [alertSettings, setAlertSettings] =
    useState<AlertSettingsPayload | null>(null);
  // ターゲット価格アラート発火イベント
  const [targetAlertEvent, setTargetAlertEvent] = useState<
    (TargetAlertInfo & { symbol: CryptoSymbol; key: number }) | null
  >(null);
  // ボラティリティアラート発火イベント
  const [volatilityAlertEvent, setVolatilityAlertEvent] = useState<{
    symbol: CryptoSymbol;
    changePercent: number;
    key: number;
  } | null>(null);

  // key はユニーク性を保証するためカウンタを使う
  const alertKeyRef = useRef(0);

  useEffect(() => {
    // ダッシュボードデータの受信イベント処理
    const onDashboardUpdate = (data: DashboardPayload) => {
      setPayload(data);

      // dashboardUpdateのペイロードからアラート情報を取り出す
      for (const symbol of SYMBOLS) {
        const symData = data[symbol];

        // ターゲット価格アラートの情報があればイベントを発火する
        if (symData.targetAlertInfo) {
          setTargetAlertEvent({
            ...symData.targetAlertInfo,
            symbol,
            key: ++alertKeyRef.current,
          });
        }

        // ボラティリティアラートが発火していて、騰落率がnullでない場合にイベントを発火する
        if (symData.volatilityAlertFired && symData.changePercent !== null) {
          setVolatilityAlertEvent({
            symbol,
            changePercent: symData.changePercent,
            key: ++alertKeyRef.current,
          });
        }
      }
    };

    // アラート設定の初期値受信イベント処理
    const onAlertSettingsLoaded = (data: AlertSettingsPayload) => {
      setAlertSettings(data);
    };

    // 受信イベントの登録
    socket.on("dashboardUpdate", onDashboardUpdate);
    socket.on("alertSettingsLoaded", onAlertSettingsLoaded);

    return () => {
      // 受信イベントの解除
      socket.off("dashboardUpdate", onDashboardUpdate);
      socket.off("alertSettingsLoaded", onAlertSettingsLoaded);
    };
  }, []);

  return (
    <DashboardContext.Provider
      value={{ payload, alertSettings, targetAlertEvent, volatilityAlertEvent }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
