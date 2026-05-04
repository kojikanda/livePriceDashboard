import { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
  Alert,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { keyframes } from "@mui/system";
import { usePriceStream } from "../hooks/usePriceStream";
import { useDashboard } from "../hooks/useDashboard";
import { PriceChart } from "./PriceChart";
import { AlertSettings } from "./AlertSettings";
import { VolatilitySettings } from "./VolatilitySettings";
import { MarketSentiment } from "./MarketSentiment";
import { VolatilityScore } from "./VolatilityScore";
import type { CryptoSymbol } from "../types/price";

// バックエンドからの送信周期（秒）
const BROADCAST_CYCLE_SEC = 5;
// グラフ表示期間のデフォルト値（分）
const CHART_DURATION_MIN_DEFAULT = 5;

// 価格上昇時のフラッシュアニメーション設定
const flashUp = keyframes`                                                                                                       
    from { color: #4caf50; }
    to   { color: inherit; }                                                                                                       
  `;
// 価格下降時のフラッシュアニメーション設定
const flashDown = keyframes`
    from { color: #f44336; }
    to   { color: inherit; }
  `;
// ボラティリティアラート発火時の赤フラッシュアニメーション設定
const pulseRed = keyframes`
    0%   { opacity: 0.1; }                                                                                                         
    50%  { opacity: 0.3; }
    100% { opacity: 0.1; }
  `;

type Props = {
  symbol: CryptoSymbol;
};

export function SymbolPanel({ symbol }: Props) {
  // コンテキストからボラティリティアラート発火イベントを取得
  const { volatilityAlertEvent } = useDashboard();

  // グラフの表示期間(分)
  const [chartDurationMin, setChartDurationMin] = useState(
    CHART_DURATION_MIN_DEFAULT,
  );

  // グラフ表示に必要な件数
  const chartHistorySize = (chartDurationMin * 60) / BROADCAST_CYCLE_SEC + 1;

  // 価格データ等をバックエンドから取得するカスタムフック
  const {
    currentPrice,
    priceHistory,
    sentimentResults,
    priceChanges,
    volatilityScore,
    changePercent,
  } = usePriceStream({ symbol });

  // ボラティリティアラート発火時のSnackbar表示フラグ
  const [showVolatilityAlert, setShowVolatilityAlert] = useState(false);

  // ボラティリティアラート発火イベントを監視してSnackbar表示フラグを更新
  useEffect(() => {
    if (volatilityAlertEvent?.symbol === symbol) {
      setShowVolatilityAlert(true);
    }
  }, [volatilityAlertEvent, symbol]);

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
    <Box>
      {/* 価格カード */}
      <Card
        sx={{
          mb: 1,
          position: "relative", // 擬似要素の基準点にするために必須
          overflow: "hidden", // アニメーションが角からはみ出さないようにする
          border: showVolatilityAlert
            ? "3px solid #f44336"
            : "1px solid rgba(255, 255, 255, 0.12)",
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
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {symbol}/USDT
          </Typography>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1, zIndex: 2 }}
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
              <Typography variant="h4" component="span">
                {currentPrice !== null
                  ? `$${currentPrice.toLocaleString()}`
                  : "接続中..."}
              </Typography>
            </Box>
            {priceDir === "up" && (
              <TrendingUpIcon
                sx={{ color: "success.main", fontSize: "2rem" }}
              />
            )}
            {priceDir === "down" && (
              <TrendingDownIcon
                sx={{ color: "error.main", fontSize: "2rem" }}
              />
            )}
            {changePercent !== null && (
              <Typography
                variant="body2"
                sx={{
                  color: changePercent >= 0 ? "success.main" : "error.main",
                }}
              >
                {changePercent >= 0 ? "+" : ""}
                {changePercent.toFixed(2)}%
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* チャート */}
      <Accordion defaultExpanded disableGutters>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{ bgcolor: "action.hover" }}
        >
          <Typography>チャート</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <PriceChart
            data={priceHistory.slice(-chartHistorySize)}
            durationMin={chartDurationMin}
            onDurationChange={setChartDurationMin}
          />
        </AccordionDetails>
      </Accordion>

      {/* マーケットセンチメント */}
      <Accordion disableGutters>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{ bgcolor: "action.hover" }}
        >
          <Typography>マーケットセンチメント</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <MarketSentiment
            sentimentResults={sentimentResults}
            priceChanges={priceChanges}
          />
        </AccordionDetails>
      </Accordion>

      {/* ボラティリティスコア */}
      <Accordion disableGutters>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{ bgcolor: "action.hover" }}
        >
          <Typography>ボラティリティスコア</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <VolatilityScore volatilityScore={volatilityScore} />
        </AccordionDetails>
      </Accordion>

      {/* アラート設定 */}
      <Accordion disableGutters>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{ bgcolor: "action.hover" }}
        >
          <Typography>アラート設定</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <AlertSettings symbol={symbol} />
          <VolatilitySettings symbol={symbol} />
        </AccordionDetails>
      </Accordion>

      {/* ボラティリティアラートのSnackbar表示 */}
      <Snackbar
        open={showVolatilityAlert}
        autoHideDuration={5000}
        onClose={() => setShowVolatilityAlert(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="warning"
          variant="filled"
          onClose={() => setShowVolatilityAlert(false)}
        >
          {symbol}：急激な価格変動を検知しました！（{changePercent?.toFixed(2)}
          %）
        </Alert>
      </Snackbar>
    </Box>
  );
}
