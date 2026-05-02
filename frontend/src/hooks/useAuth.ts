import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

/**
 * 認証状態を管理するコンテキストを利用するためのカスタムフック
 * @returns 認証状態を提供するコンテキスト
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
