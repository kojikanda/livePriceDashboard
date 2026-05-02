import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
} from "@mui/material";
import { useAuth } from "../hooks/useAuth";

/**
 * ログインページのコンポーネント
 * @returns ログインページのコンポーネント
 */
export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // フォーム送信処理
  const handleSubmit = async (e: { preventDefault(): void }) => {
    // フォームのデフォルトの送信動作を防止
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      // ログイン処理を実行
      await login(email, password);
      setIsNavigating(true);
      navigate("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期しないエラーが発生しました",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100dvh",
      }}
    >
      <Card sx={{ width: 400 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            ログイン
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="メールアドレス"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="パスワード"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || isNavigating}
              fullWidth
            >
              {submitting ? "ログイン中..." : "ログイン"}
            </Button>
          </Box>
          <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
            アカウントをお持ちでない方は{" "}
            <Link component={RouterLink} to="/register">
              こちら
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
