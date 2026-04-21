import { useEffect, useRef, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Snackbar,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { keyframes } from "@mui/system";
import { usePriceStream } from "./hooks/usePriceStream";
import { PriceChart } from "./components/PriceChart";
import { AlertSettings } from "./components/AlertSettings";

const SYMBOL = "BTC";
const MAX_HISTORY = 100;

// アニメーション定義
const flashUp = keyframes`
    from { color: #4caf50; }                                                                           
    to   { color: inherit; }
  `;
const flashDown = keyframes`
    from { color: #f44336; }
    to   { color: inherit; }
  `;
const pulseRed = keyframes`
  0%   { opacity: 0.1; }
  50%  { opacity: 0.3; }
  100% { opacity: 0.1; }
`;

function App() {
  const {
    currentPrice,
    history,
    changePercent,
    showVolatilityAlert,
    setShowVolatilityAlert,
  } = usePriceStream({ symbol: SYMBOL, maxHistory: MAX_HISTORY });

  // 前回価格（再レンダリング不要なので、useRefを使用）
  const prevPriceRef = useRef<number | null>(null);
  // トレンド方向
  const [priceDir, setPriceDir] = useState<"up" | "down" | null>(null);
  // フラッシュアニメーション方向とキー（key変化でアニメーション再起動）
  const [flashDir, setFlashDir] = useState<"up" | "down" | null>(null);
  const [flashKey, setFlashKey] = useState(0);

  // 価格が変化したときにトレンドとフラッシュを更新
  useEffect(() => {
    if (currentPrice === null) return;
    if (prevPriceRef.current !== null) {
      if (currentPrice > prevPriceRef.current) {
        setPriceDir("up");
        setFlashDir("up");
        setFlashKey((k) => k + 1);
      } else if (currentPrice < prevPriceRef.current) {
        setPriceDir("down");
        setFlashDir("down");
        setFlashKey((k) => k + 1);
      }
    }
    prevPriceRef.current = currentPrice;
  }, [currentPrice]);

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Live Price Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {SYMBOL}/USDT
        </Typography>

        {/* 価格カード */}
        <Card
          sx={{
            mt: 2,
            position: "relative", // 擬似要素の基準点にするために必須
            overflow: "hidden", // アニメーションが角からはみ出さないようにする
            border: showVolatilityAlert
              ? "3px solid #f44336"
              : "1px solid rgba(255, 255, 255, 0.12)", // 非アラート時も枠線を少し出すと馴染む
            transition: "border 0.3s ease",

            // アラート時のみ ::after 擬似要素を出現させる
            "&::after": showVolatilityAlert
              ? {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#f44336", // ここで純粋な赤を指定
                  animation: `${pulseRed} 1.5s ease infinite`,
                  pointerEvents: "none", // クリックなどを邪魔しないようにする
                  zIndex: 1, // コンテンツの上に重ねる
                }
              : {},
          }}
        >
          <CardContent>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, zIndex: 2 }} // コンテンツをアラートよりも全面に出すためzIndexを指定
            >
              {/* フラッシュ効果（key変化でアニメーション再起動） */}
              <Box
                key={flashKey}
                component="span"
                sx={{
                  animation:
                    flashDir === "up"
                      ? `${flashUp} 1.5s ease forwards`
                      : flashDir === "down"
                        ? `${flashDown} 1.5s ease forwards`
                        : "none",
                }}
              >
                <Typography variant="h2" component="span">
                  {currentPrice !== null
                    ? `$${currentPrice.toLocaleString()}`
                    : "接続中..."}
                </Typography>
              </Box>

              {/* トレンドアイコン */}
              {priceDir === "up" && (
                <TrendingUpIcon
                  sx={{ color: "success.main", fontSize: "2.5rem" }}
                />
              )}
              {priceDir === "down" && (
                <TrendingDownIcon
                  sx={{ color: "error.main", fontSize: "2.5rem" }}
                />
              )}

              {/* 変動率 */}
              {changePercent !== null && (
                <Typography
                  variant="body1"
                  sx={{
                    color: changePercent >= 0 ? "success.main" : "error.main",
                    ml: 1,
                  }}
                >
                  {changePercent >= 0 ? "+" : ""}
                  {changePercent.toFixed(2)}%
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>

        <AlertSettings symbol={SYMBOL} currentPrice={currentPrice} />
        <PriceChart symbol={SYMBOL} data={history} />
      </Box>

      {/* ボラティリティアラート */}
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
