import { useState, useEffect, type ReactNode } from "react";
import { socket } from "../lib/socket";
import { DashboardContext } from "./DashboardContext";
import type { DashboardPayload } from "../types/price";

/**
 * ダッシュボード全体のデータを管理するプロバイダコンポーネント
 * @param children このプロバイダでラップされた子コンポーネント
 * @returns ダッシュボード全体のデータを提供するコンテキストプロバイダコンポーネント
 */
export function DashboardProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);

  useEffect(() => {
    const handler = (data: DashboardPayload) => {
      setPayload(data);
    };
    socket.on("dashboardUpdate", handler);
    return () => {
      socket.off("dashboardUpdate", handler);
    };
  }, []);

  return (
    <DashboardContext.Provider value={{ payload }}>
      {children}
    </DashboardContext.Provider>
  );
}
