import { createContext } from "react";
import type { User } from "../types/auth";

/**
 * 認証状態を管理するコンテキストの型定義
 */
type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

/**
 * 認証状態を管理するReactコンテキスト
 */
export const AuthContext = createContext<AuthContextType | null>(null);
