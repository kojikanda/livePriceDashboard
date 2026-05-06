import {
  Box,
  Button,
  Container,
  Tooltip,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LogoutIcon from "@mui/icons-material/Logout";
import { DashboardProvider } from "../context/DashboardProvider";
import { SymbolPanel } from "../components/SymbolPanel";
import { PortfolioSimulator } from "../components/PortfolioSimulator";
import { useAuth } from "../hooks/useAuth";
import type { CryptoSymbol } from "../types/price";

const SYMBOLS: CryptoSymbol[] = ["BTC", "ETH", "SOL"];

export function Dashboard() {
  // ユーザ認証のカスタムフックからログアウトメソッドを取得
  const { logout, user } = useAuth();

  // ログアウトボタン押下のイベントハンドラ
  const onLogoutButtonClicked = () => {
    logout().catch(console.log);
  };

  return (
    <DashboardProvider>
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          {/* ヘッダ */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" }, // スマホ: 縦並び、sm以上: 横並び
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              gap: { xs: 1, sm: 0 },
              mb: 2,
            }}
          >
            <Typography
              variant="h4"
              sx={{ fontSize: { xs: "1.5rem", sm: "2.125rem" } }} // スマホは文字を小さく
            >
              Live Price Dashboard
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
              <Tooltip title="ログアウト">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<LogoutIcon />}
                  onClick={onLogoutButtonClicked}
                  color="inherit"
                >
                  ログアウト
                </Button>
              </Tooltip>
            </Box>
          </Box>

          {/* 3銘柄グリッド */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              "@media (max-width: 1350px)": {
                gridTemplateColumns: "1fr",
              },
              gap: 2,
              alignItems: "start",
              "& > *": { minWidth: 0 },
            }}
          >
            {SYMBOLS.map((symbol) => (
              <Box
                key={symbol}
                sx={
                  symbol !== "BTC"
                    ? { "@media (max-width: 1350px)": { display: "none" } }
                    : undefined
                }
              >
                <SymbolPanel symbol={symbol} />
              </Box>
            ))}
          </Box>

          {/* 仮想ポートフォリオ */}
          <Accordion
            sx={{
              mt: 2,
              "@media (max-width: 1350px)": { display: "none" },
            }}
            disableGutters
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ bgcolor: "action.hover" }}
            >
              <Typography variant="h6">仮想ポートフォリオ</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <PortfolioSimulator />
            </AccordionDetails>
          </Accordion>
        </Box>
      </Container>
    </DashboardProvider>
  );
}
