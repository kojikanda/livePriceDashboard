import { Box, Container, Typography, Snackbar, Alert } from "@mui/material";
import { usePriceStream } from "./hooks/usePriceStream";
import { PriceChart } from "./components/PriceChart";
import { AlertSettings } from "./components/AlertSettings";

const SYMBOL = "BTC";
const MAX_HISTORY = 100;

function App() {
  const {
    currentPrice,
    history,
    changePercent,
    showVolatilityAlert,
    setShowVolatilityAlert,
  } = usePriceStream({ symbol: SYMBOL, maxHistory: MAX_HISTORY });

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Live Price Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {SYMBOL}/USDT
        </Typography>

        {/* 価格と変動率 */}
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 2, mt: 2 }}>
          <Typography variant="h2">
            {currentPrice !== null
              ? `$${currentPrice.toLocaleString()}`
              : "接続中..."}
          </Typography>
          {changePercent !== null && (
            <Typography
              variant="body1"
              sx={{ color: changePercent >= 0 ? "success.main" : "error.main" }}
            >
              {changePercent >= 0 ? "+" : ""}
              {changePercent?.toFixed(2)}%
            </Typography>
          )}
        </Box>

        <AlertSettings symbol={SYMBOL} currentPrice={currentPrice} />
        <PriceChart symbol={SYMBOL} data={history} />
      </Box>

      {/* ボラティリティアラート用 */}
      <Snackbar
        open={showVolatilityAlert}
        autoHideDuration={5000}
        onClose={() => setShowVolatilityAlert(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="warning" onClose={() => setShowVolatilityAlert(false)}>
          急激な価格変動を検知しました！（{changePercent?.toFixed(2)}%）
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default App;
