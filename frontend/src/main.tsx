import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { AuthProvider } from "./context/AuthProvider.tsx";
import "./index.css";
import App from "./App.tsx";

const darkTheme = createTheme({
  palette: {
    mode: "dark", // MUI全体をダークテーマに
  },
});

// 開発時のみ:first-childに関するエラーログが出ないようにする
if (import.meta.env.DEV) {
  const originalConsoleError = console.error.bind(console);
  console.error = (...args: Parameters<typeof console.error>) => {
    // Emotion の :first-child 警告は SSR 非使用のため無害なので抑制する
    if (typeof args[0] === "string" && args[0].includes(":first-child")) return;
    originalConsoleError(...args);
  };
}

// アプリケーションのルートコンポーネントをレンダリング
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline /> {/* ブラウザのデフォルトスタイルをリセット */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
