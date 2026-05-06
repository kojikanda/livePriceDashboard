import { useState, useEffect, useCallback, type ReactNode } from "react";
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
  const [forceLogoutMessage, setForceLogoutMessage] = useState<string | null>(
    null,
  );

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

  // forceDisconnectイベントの処理（別端末からのログインによる強制切断）
  useEffect(() => {
    const handleForceDisconnect = ({ reason }: { reason: string }) => {
      console.log("強制切断イベント検知");
      // バックエンドから送信されたメッセージをstateに保持
      setForceLogoutMessage(reason);

      // Cookieを削除して、リフレッシュ後の再接続を防ぐ
      void fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});

      // 切断
      console.log("切断実行");
      socket.disconnect();
      // ユーザをnullにすることで、ProtectedRouteが/loginにリダイレクトする
      setUser(null);
    };

    socket.on("forceDisconnect", handleForceDisconnect);
    return () => {
      socket.off("forceDisconnect", handleForceDisconnect);
    };
  }, []);

  // 強制ログアウトメッセージをクリアするメソッド
  const clearForceLogoutMessage = useCallback(
    () => setForceLogoutMessage(null),
    [],
  );

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

    // ログインに成功したとき、強制ログアウト時のメッセージをクリアする
    setForceLogoutMessage(null);

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
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        forceLogoutMessage,
        clearForceLogoutMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
