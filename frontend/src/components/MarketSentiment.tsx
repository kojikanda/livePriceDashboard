import { useState } from "react";
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
import {
  type SentimentResult,
  type PriceChangeSummary,
  type SentimentWindow,
  SENTIMENT_WINDOWS,
} from "../types/price";

type Props = {
  sentimentResults: Record<SentimentWindow, SentimentResult> | null;
  priceChanges: PriceChangeSummary[];
};

/**
 * マーケット・センチメントコンポーネント
 * @param props.sentimentResults センチメントの集計結果
 * @param props.priceChanges 騰落率サマリーの配列
 * @returns マーケット・センチメントコンポーネント
 */
export function MarketSentiment({ sentimentResults, priceChanges }: Props) {
  // センチメント・バーの算出対象回数
  const [sentimentWindow, setSentimentWindow] = useState<SentimentWindow>(50);

  // センチメントの割合算出結果をパーセンテージに変換
  const sentiment = sentimentResults?.[sentimentWindow] ?? null;
  const upPct = Math.round((sentiment?.upRatio ?? 0.5) * 100);
  const downPct = Math.round((sentiment?.downRatio ?? 0.5) * 100);

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
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
                setSentimentWindow(Number(e.target.value) as SentimentWindow)
              }
              size="small"
              variant="standard"
              sx={{ mx: 0.5, fontSize: "0.875rem" }}
            >
              {SENTIMENT_WINDOWS.map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </Select>
            回
          </Typography>

          {/* 上昇/下落のカウント */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <Typography variant="caption" sx={{ color: "success.main" }}>
              ▲ 上昇 {sentiment?.upCount ?? "--"}回（{upPct}%）
            </Typography>
            <Typography variant="caption" sx={{ color: "error.main" }}>
              ▼ 下落 {sentiment?.downCount ?? "--"}回（{downPct}%）
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
            value={upPct}
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
