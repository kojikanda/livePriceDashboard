import { useState, useEffect, type ReactNode } from "react";
import { socket } from "../lib/socket";
import type { User } from "../types/auth";
import { AuthContext } from "./AuthContext";

const API = import.meta.env.VITE_API_URL;

/**
 * 認証状態を管理するプロバイダコンポーネント
 * @param children このプロバイダでラップされた子コンポーネント
 * @returns 認証状態を提供するコンテキストプロバイダコンポーネント
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ページリロード時に認証状態を確認する
  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? (res.json() as Promise<User>) : null))
      .then((data) => {
        setUser(data);

        // 認証済みならSocket接続
        if (data) socket.connect();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /**
   * ログイン処理
   * @param email メールアドレス
   * @param password パスワード
   */
  const login = async (email: string, password: string) => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    const data: User = await res.json();
    setUser(data);
    socket.connect();
  };

  /**
   * ユーザ登録処理
   * @param email メールアドレス
   * @param password パスワード
   */
  const register = async (email: string, password: string) => {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    const data: User = await res.json();
    setUser(data);
    socket.connect();
  };

  /**
   * ログアウト処理
   */
  const logout = async () => {
    await fetch(`${API}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    socket.disconnect();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
