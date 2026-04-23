import { useState, useEffect, useRef } from "react";
import { Box, TextField, Typography, Snackbar, Alert } from "@mui/material";

type Props = {
  symbol: string;
  currentPrice: number | null;
};

/**
 * アラート設定・表示コンポーネント
 * @param props.symbol 銘柄のシンボル
 * @param props.currentPrice 現在の価格
 * @returns アラート設定・表示コンポーネント
 */
export function AlertSettings({ symbol, currentPrice }: Props) {
  // 上限価格の設定値
  const [targetHigh, setTargetHigh] = useState<string>("");
  // 下限価格の設定値
  const [targetLow, setTargetLow] = useState<string>("");
  // アラートのメッセージ
  const [alertMessage, setAlertMessage] = useState<string>("");
  // トースト表示中かどうか
  const [open, setOpen] = useState(false);
  // 上限価格以上、下限価格以下の情報を保持する
  // この値の変化でレンダリングを発生させないため、useRefを使う
  const alertedRef = useRef<{ high: boolean; low: boolean }>({
    high: false,
    low: false,
  });

  // 上限価格、下限価格との比較結果算出処理
  useEffect(() => {
    if (currentPrice === null) return;

    const high = parseFloat(targetHigh);
    const low = parseFloat(targetLow);

    if (!isNaN(high) && currentPrice >= high && !alertedRef.current.high) {
      // 上限価格以上に変化したとき
      alertedRef.current.high = true;
      setAlertMessage(
        `${symbol} が上限価格 $${high.toLocaleString()} に到達しました`,
      );
      setOpen(true);
    } else if (currentPrice < high) {
      // 上限価格未満のとき
      alertedRef.current.high = false;
    }

    if (!isNaN(low) && currentPrice <= low && !alertedRef.current.low) {
      // 下限価格以下に変化したとき
      alertedRef.current.low = true;
      setAlertMessage(
        `${symbol} が下限価格 $${low.toLocaleString()} に到達しました`,
      );
      setOpen(true);
    } else if (currentPrice > low) {
      // 下限価格より大きいとき
      alertedRef.current.low = false;
    }
  }, [currentPrice, targetHigh, targetLow, symbol]);

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Alert Settings
      </Typography>
      <Box sx={{ display: "flex", gap: 2 }}>
        <TextField
          variant="outlined"
          label="Target High"
          type="number"
          value={targetHigh}
          onChange={(e) => setTargetHigh(e.target.value)}
          size="small"
        />
        <TextField
          variant="outlined"
          label="Target Low"
          type="number"
          value={targetLow}
          onChange={(e) => setTargetLow(e.target.value)}
          size="small"
        />
      </Box>
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={() => setOpen(false)}
      >
        <Alert
          severity="warning"
          variant="filled"
          onClose={() => setOpen(false)}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
