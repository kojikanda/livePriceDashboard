import { useState, useEffect, useCallback, type ReactNode } from "react";
import { socket } from "../lib/socket";
import type { User } from "../types/auth";
import { AuthContext } from "./AuthContext";

const API = import.meta.env.VITE_API_URL;
const JWT_KEY = "jwt";

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
    // iOS向けブラウザ対応のため、localStorageからトークンを取得し、Authorizationヘッダで送信
    const storedToken = localStorage.getItem(JWT_KEY);
    const headers: HeadersInit = storedToken
      ? { Authorization: `Bearer ${storedToken}` }
      : {};

    fetch(`${API}/auth/me`, { credentials: "include", headers })
      .then((res) =>
        res.ok ? (res.json() as Promise<User & { token: string }>) : null,
      )
      .then((data) => {
        if (data) {
          // ユーザ認証OKのとき
          // トークンをlocalStorageに保存
          localStorage.setItem(JWT_KEY, data.token);
          // ユーザ情報を設定
          setUser({ userId: data.userId, email: data.email });
          // socket.authにトークンをセット
          socket.auth = { token: data.token };
          // WebSocketで接続
          socket.connect();
        }
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

      // 強制切断
      socket.disconnect();
      console.log("強制切断実行");

      // localStorageからトークンを削除
      localStorage.removeItem(JWT_KEY);
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

    const data: User & { token: string } = await res.json();
    // トークンをlocalStorageに保存
    localStorage.setItem(JWT_KEY, data.token);
    // ユーザ情報を設定
    setUser({ userId: data.userId, email: data.email });
    // socket.authにトークンをセット
    socket.auth = { token: data.token };
    // WebSocketで接続
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

    const data: User & { token: string } = await res.json();
    // トークンをlocalStorageに保存
    localStorage.setItem(JWT_KEY, data.token);
    // ユーザ情報を設定
    setUser({ userId: data.userId, email: data.email });
    // socket.authにトークンをセット
    socket.auth = { token: data.token };
    // WebSocketで接続
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
    // WebSocket通信を切断
    socket.disconnect();
    // トークンをlocalStorageから削除
    localStorage.removeItem(JWT_KEY);
    // ユーザ情報削除
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
