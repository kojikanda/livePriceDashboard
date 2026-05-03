import { createContext } from "react";
import type { DashboardPayload } from "../types/price";

/**
 * ダッシュボード全体のデータを管理するコンテキストの型定義
 */
export type DashboardContextType = {
  payload: DashboardPayload | null;
};

/**
 * ダッシュボード全体のデータを管理するReactコンテキスト
 */
export const DashboardContext = createContext<DashboardContextType | null>(
  null,
);
