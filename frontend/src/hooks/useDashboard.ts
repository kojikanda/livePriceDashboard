import { useContext } from "react";
import { DashboardContext } from "../context/DashboardContext";

/**
 * ダッシュボード全体のデータを管理するコンテキストを利用するためのカスタムフック
 * @returns ダッシュボード全体のデータを提供するコンテキスト
 */
export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx)
    throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
