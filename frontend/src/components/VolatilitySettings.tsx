import { useState, useEffect, useRef } from "react";
import { Box, Card, CardContent, TextField, Typography } from "@mui/material";
import { socket } from "../lib/socket";
import { useDashboard } from "../hooks/useDashboard";
import type { CryptoSymbol } from "../types/price";

// 監視ウィンドウの入力値の最小値(秒)
const VOL_WINDOW_SEC_MIN = 10;
// 監視ウィンドウの入力値の最大値(秒)
const VOL_WINDOW_SEC_MAX = 3600;
// 監視ウィンドウのデフォルト値(秒)
const VOL_WINDOW_DEFAULT = 60;
// ボラティリティアラート閾値の最小値(%)
const VOL_THRESHOLD_MIN = 0.01;
// ボラティリティアラート閾値の最大値(%)
const VOL_THRESHOLD_MAX = 100;
// ボラティリティアラート閾値の入力ステップ(%)
const VOL_THRESHOLD_STEP = 0.1;
// ボラティリティアラート閾値のデフォルト値(%)
const VOL_THRESHOLD_DEFAULT = 1.0;

type Props = {
  symbol: CryptoSymbol;
};

/**
 * ボラティリティ設定コンポーネント
 * @param props.symbol 銘柄
 * @returns ボラティリティ設定コンポーネント
 */
export function VolatilitySettings({ symbol }: Props) {
  // コンテキストからDBから読み込んだ設定を取得
  const { alertSettings } = useDashboard();
  // 監視ウィンドウの入力値
  const [windowInput, setWindowInput] = useState(String(VOL_WINDOW_DEFAULT));
  // アラート閾値の入力値
  const [thresholdInput, setThresholdInput] = useState(
    String(VOL_THRESHOLD_DEFAULT),
  );
  // 監視ウィンドウの入力エラー発生有無
  const [windowError, setWindowError] = useState(false);
  // アラート閾値の入力エラー発生有無
  const [thresholdError, setThresholdError] = useState(false);

  // 一度だけ初期化するためのフラグ
  const initializedRef = useRef(false);

  // DBから読み込んだ設定で初期化する（接続後に1回だけ実行）
  useEffect(() => {
    if (initializedRef.current) return;
    const initial = alertSettings?.volatilitySettings?.[symbol];
    if (!initial) return;

    setWindowInput(String(initial.windowSec));
    setThresholdInput(String(initial.threshold));
    initializedRef.current = true;
  }, [alertSettings, symbol]);

  // 監視ウィンドウの値変更時のイベントハンドラ
  const handleWindowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setWindowInput(raw);
    const v = parseInt(raw, 10);
    setWindowError(
      isNaN(v) || v < VOL_WINDOW_SEC_MIN || v > VOL_WINDOW_SEC_MAX,
    );
  };

  // アラート閾値変更時のイベントハンドラ
  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setThresholdInput(raw);
    const v = parseFloat(raw);
    setThresholdError(
      isNaN(v) || v < VOL_THRESHOLD_MIN || v > VOL_THRESHOLD_MAX,
    );
  };

  // 監視ウィンドウか閾値かのどちらかのフィールドから onBlurが来たら、有効値のときのみバックエンドへ設定値を送信する
  const handleBlur = () => {
    const windowSec = parseInt(windowInput, 10);
    const threshold = parseFloat(thresholdInput);
    const windowValid =
      !isNaN(windowSec) &&
      windowSec >= VOL_WINDOW_SEC_MIN &&
      windowSec <= VOL_WINDOW_SEC_MAX;
    const thresholdValid =
      !isNaN(threshold) &&
      threshold >= VOL_THRESHOLD_MIN &&
      threshold <= VOL_THRESHOLD_MAX;
    if (windowValid && thresholdValid) {
      socket.emit("saveVolatilityAlert", { symbol, windowSec, threshold });
    }
  };

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          ボラティリティアラート設定
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="監視ウィンドウ（秒）"
            type="number"
            size="small"
            value={windowInput}
            onChange={handleWindowChange}
            onBlur={handleBlur}
            error={windowError}
            helperText={
              windowError
                ? `${VOL_WINDOW_SEC_MIN}〜${VOL_WINDOW_SEC_MAX} の範囲で入力してください`
                : " "
            }
            sx={{ minWidth: 200 }}
            slotProps={{
              htmlInput: { min: VOL_WINDOW_SEC_MIN, max: VOL_WINDOW_SEC_MAX },
            }}
          />
          <TextField
            label="アラート閾値（%）"
            type="number"
            size="small"
            value={thresholdInput}
            onChange={handleThresholdChange}
            onBlur={handleBlur}
            error={thresholdError}
            helperText={
              thresholdError
                ? `${VOL_THRESHOLD_MIN}〜${VOL_THRESHOLD_MAX} の範囲で入力してください`
                : " "
            }
            sx={{ minWidth: 180 }}
            slotProps={{
              htmlInput: {
                min: VOL_THRESHOLD_MIN,
                max: VOL_THRESHOLD_MAX,
                step: VOL_THRESHOLD_STEP,
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
