import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import "./index.css";
import App from "./App.tsx";

const darkTheme = createTheme({
  palette: {
    mode: "dark", // MUI全体をダークテーマに
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline /> {/* ブラウザのデフォルトスタイルをリセット */}
      <App />
    </ThemeProvider>
  </StrictMode>,
);
