import { useState } from "react";
import { Box, Card, CardContent, TextField, Typography } from "@mui/material";

const VOL_WINDOW_SEC_MIN = 10;
const VOL_WINDOW_SEC_MAX = 3600;
const VOL_THRESHOLD_MIN = 0.01;
const VOL_THRESHOLD_MAX = 100;
const VOL_THRESHOLD_STEP = 0.1;

type Props = {
  volatilityWindowSec: number;
  volatilityThreshold: number;
  onWindowChange: (value: number) => void;
  onThresholdChange: (value: number) => void;
};

/**
 * ボラティリティ設定コンポーネント
 * @param props.volatilityWindowSec ボラティリティ監視ウィンドウ(秒)
 * @param props.volatilityThreshold ボラティリティアラート閾値(%)
 * @param props.onWindowChange 監視ウィンドウ変更時のイベントハンドラ
 * @param props.onThresholdChange アラート閾値変更時のイベントハンドラ
 * @returns ボラティリティ設定コンポーネント
 */
export function VolatilitySettings({
  volatilityWindowSec,
  volatilityThreshold,
  onWindowChange,
  onThresholdChange,
}: Props) {
  // 監視ウィンドウの入力値
  const [windowInput, setWindowInput] = useState(String(volatilityWindowSec));
  // アラート閾値の入力値
  const [thresholdInput, setThresholdInput] = useState(
    String(volatilityThreshold),
  );
  // 監視ウィンドウの入力エラー発生有無
  const [windowError, setWindowError] = useState(false);
  // アラート閾値の入力エラー発生有無
  const [thresholdError, setThresholdError] = useState(false);

  // 監視ウィンドウの値変更時のイベントハンドラ
  const handleWindowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setWindowInput(raw);
    const v = parseInt(raw, 10);
    const isValid =
      !isNaN(v) && v >= VOL_WINDOW_SEC_MIN && v <= VOL_WINDOW_SEC_MAX;
    setWindowError(!isValid);
    if (isValid) onWindowChange(v);
  };

  // アラート閾値変更時のイベントハンドラ
  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setThresholdInput(raw);
    const v = parseFloat(raw);
    const isValid =
      !isNaN(v) && v >= VOL_THRESHOLD_MIN && v <= VOL_THRESHOLD_MAX;
    setThresholdError(!isValid);
    if (isValid) onThresholdChange(v);
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
