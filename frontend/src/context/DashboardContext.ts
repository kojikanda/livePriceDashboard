import { createContext } from "react";
import type {
  DashboardPayload,
  AlertSettingsPayload,
  TargetAlertInfo,
  CryptoSymbol,
} from "../types/price";

/**
 * ダッシュボード全体のデータを管理するコンテキストの型定義
 */
export type DashboardContextType = {
  // バックエンドから受信した全銘柄分のデータ
  payload: DashboardPayload | null;
  // 接続時にDBから読み込んだ設定の初期値
  alertSettings: AlertSettingsPayload | null;
  // ターゲット価格アラート発火イベント
  targetAlertEvent:
    | (TargetAlertInfo & { symbol: CryptoSymbol; key: number })
    | null;
  // ボラティリティアラート発火イベント
  volatilityAlertEvent: {
    symbol: CryptoSymbol;
    changePercent: number;
    key: number;
  } | null;
};

/**
 * ダッシュボード全体のデータを管理するReactコンテキスト
 */
export const DashboardContext = createContext<DashboardContextType | null>(
  null,
);
