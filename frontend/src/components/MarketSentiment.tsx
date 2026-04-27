import { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  LinearProgress,
  MenuItem,
  Select,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import type { PriceData } from "../types/price";
import { calcSentiment, calcPriceChanges } from "../utils/sentimentCalc";

type Props = {
  history: PriceData[];
  currentPrice: number | null;
};

/**
 * マーケット・センチメントコンポーネント
 * @param props.history 価格履歴
 * @param props.currentPrice 現在の価格
 * @returns マーケット・センチメントコンポーネント
 */
export function MarketSentiment({ history, currentPrice }: Props) {
  // センチメント・バーの算出対象回数
  const [sentimentWindow, setSentimentWindow] = useState(30);

  // センチメントの集計結果
  const sentiment = useMemo(
    () => calcSentiment(history, sentimentWindow),
    [history, sentimentWindow],
  );

  // 騰落率の計算結果
  const priceChanges = useMemo(
    () =>
      currentPrice !== null ? calcPriceChanges(history, currentPrice) : [],
    [history, currentPrice],
  );

  // センチメントの割合算出結果をパーセンテージに変換
  const upPct = Math.round(sentiment.upRatio * 100);
  const downPct = Math.round(sentiment.downRatio * 100);

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Market Overview
        </Typography>

        {/* センチメントバー */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary" component="div">
            直近
            <Select
              value={sentimentWindow}
              onChange={(e: SelectChangeEvent<number>) =>
                setSentimentWindow(Number(e.target.value))
              }
              size="small"
              variant="standard"
              sx={{ mx: 0.5, fontSize: "0.875rem" }}
            >
              {[10, 20, 30, 50, 100, 200, 300].map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </Select>
            回のセンチメント
          </Typography>

          {/* 上昇/下落のカウント */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <Typography variant="caption" sx={{ color: "success.main" }}>
              ▲ 上昇 {sentiment.upCount}回（{upPct}%）
            </Typography>
            <Typography variant="caption" sx={{ color: "error.main" }}>
              ▼ 下落 {sentiment.downCount}回（{downPct}%）
            </Typography>
          </Box>
        </Box>

        {/*
            LinearProgress を1本使い、                                                                                             
            緑バー（上昇率）が左から伸び、赤い背景（下落側）が右に残る形で表示。                                                   
            中央の白い線がニュートラル（50%）を示す。                                                                              
          */}
        <Box sx={{ position: "relative", mb: 1 }}>
          <LinearProgress
            variant="determinate"
            value={sentiment.upRatio * 100}
            sx={{
              height: 24,
              borderRadius: 1,
              bgcolor: "error.dark",
              "& .MuiLinearProgress-bar": {
                bgcolor: "success.main",
                borderRadius: 1,
                transition: "transform 0.5s ease",
              },
            }}
          />
          {/* ニュートラル中央マーカー */}
          <Box
            sx={{
              position: "absolute",
              left: "50%",
              top: 0,
              bottom: 0,
              width: 2,
              bgcolor: "common.white",
              opacity: 0.6,
              transform: "translateX(-50%)",
            }}
          />
        </Box>

        {/* ラベル */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="caption" sx={{ color: "success.main" }}>
            Bullish（強気）
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ニュートラル
          </Typography>
          <Typography variant="caption" sx={{ color: "error.main" }}>
            Bearish（弱気）
          </Typography>
        </Box>

        {/* 騰落率サマリー */}
        <Typography variant="body2" color="text.secondary" gutterBottom>
          騰落率サマリー
        </Typography>

        <Box sx={{ display: "flex", gap: 2 }}>
          {priceChanges.map(({ label, pct }) => (
            <Card
              key={label}
              variant="outlined"
              sx={{ flex: 1, textAlign: "center" }}
            >
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block" }}
                >
                  {label}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color:
                      pct === null
                        ? "text.secondary"
                        : pct >= 0
                          ? "success.main"
                          : "error.main",
                  }}
                >
                  {pct === null
                    ? "---"
                    : `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
