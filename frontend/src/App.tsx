import { Box, Container, Typography } from "@mui/material";
import { usePriceStream } from "./hooks/usePriceStream";
import { PriceChart } from "./components/PriceChart";
import { AlertSettings } from "./components/AlertSettings";

const SYMBOL = "BTC";
const MAX_HISTORY = 50;

function App() {
  const { currentPrice, history } = usePriceStream({
    symbol: SYMBOL,
    maxHistory: MAX_HISTORY,
  });

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Live Price Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {SYMBOL}/USDT
        </Typography>
        <Typography variant="h2" sx={{ mt: 2 }}>
          {currentPrice !== null
            ? `$${currentPrice.toLocaleString()}`
            : "接続中..."}
        </Typography>
        <AlertSettings symbol={SYMBOL} currentPrice={currentPrice} />
        <PriceChart symbol={SYMBOL} data={history} />
      </Box>
    </Container>
  );
}

export default App;
