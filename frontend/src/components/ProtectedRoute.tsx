import { Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import type { ReactNode } from "react";

/**
 * 要認証ルートのコンポーネント
 * @param children このコンポーネントでラップされた子コンポーネント
 * @returns 要認証ルートのコンポーネント
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  // 認証確認中はローディング表示
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // 未認証ならログイン画面へリダイレクト
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}
