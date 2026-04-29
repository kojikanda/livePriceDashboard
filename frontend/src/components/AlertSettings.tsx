import { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  TextField,
  Typography,
  Snackbar,
  Alert,
  Switch,
  FormControlLabel,
} from "@mui/material";

// 自動再設定値を算出する現在価格に対する割合
const OFFSET_RATE = 0.01;

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
  // 自動更新のON/OFF
  const [autoReset, setAutoReset] = useState(false);
  // トースト表示中かどうか
  const [open, setOpen] = useState(false);
  // 上限価格・下限価格入力中かどうかを保持する
  const [focusedField, setFocusedField] = useState<"high" | "low" | null>(null);

  // 上限価格以上、下限価格以下の情報を保持する
  // この値の変化でレンダリングを発生させないため、useRefを使う
  const alertedRef = useRef<{ high: boolean; low: boolean }>({
    high: false,
    low: false,
  });

  /**
   * 自動再設定動作による上限・下限価格再設定処理
   */
  const setTargetValueByAutoReset = useCallback(
    (cPrice: number, isExceedUpperLimit: boolean) => {
      const newHigh = cPrice * (1 + OFFSET_RATE);
      const newLow = cPrice * (1 - OFFSET_RATE);
      setTargetHigh(newHigh.toFixed(2));
      setTargetLow(newLow.toFixed(2));

      const limitStr = isExceedUpperLimit ? "上限" : "下限";
      setAlertMessage(
        `
        ${symbol} が${limitStr}価格に到達 → 
        次のアラートを $${newHigh.toLocaleString(undefined, { maximumFractionDigits: 2 })} / 
        $${newLow.toLocaleString(undefined, { maximumFractionDigits: 2 })} に自動設定しました
        `,
      );
    },
    /*
     * useCallbackに指定する依存配列は、「関数の中で使っている値のうち、レンダリングをまたいで変わりうるもの」。
     * setTargethighなどのsetterはReactが安定を保証するので指定不要。
     * symbolはpropsで指定が変わる可能性があるので、要指定。
     */
    [symbol],
  );

  // 上限価格、下限価格との比較結果算出処理
  useEffect(() => {
    if (currentPrice === null) return;
    // 上限価格・下限価格入力中はアラートのチェックを行わない
    if (focusedField !== null) return;

    const high = parseFloat(targetHigh);
    const low = parseFloat(targetLow);

    if (!isNaN(high) && currentPrice >= high && !alertedRef.current.high) {
      // 上限価格以上に変化したとき
      alertedRef.current.high = true;

      if (autoReset) {
        // 上限・下限価格自動再設定
        setTargetValueByAutoReset(currentPrice, true);
      } else {
        setAlertMessage(
          `${symbol} が上限価格 $${high.toLocaleString()} に到達しました`,
        );
      }
      setOpen(true);
    } else if (currentPrice < high) {
      // 上限価格未満のとき
      alertedRef.current.high = false;
    }

    if (!isNaN(low) && currentPrice <= low && !alertedRef.current.low) {
      // 下限価格以下に変化したとき
      alertedRef.current.low = true;

      if (autoReset) {
        // 上限・下限価格自動再設定
        setTargetValueByAutoReset(currentPrice, false);
      } else {
        setAlertMessage(
          `${symbol} が下限価格 $${low.toLocaleString()} に到達しました`,
        );
      }
      setOpen(true);
    } else if (currentPrice > low) {
      // 下限価格より大きいとき
      alertedRef.current.low = false;
    }
  }, [
    currentPrice,
    targetHigh,
    targetLow,
    symbol,
    autoReset,
    setTargetValueByAutoReset,
    focusedField,
  ]);

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        ターゲット価格アラート
      </Typography>
      <Box sx={{ display: "flex", gap: 2 }}>
        <TextField
          label="上限価格"
          type="number"
          value={targetHigh}
          onChange={(e) => setTargetHigh(e.target.value)}
          onFocus={() => setFocusedField("high")}
          onBlur={() => setFocusedField(null)}
          helperText={
            focusedField === "high"
              ? "入力中はアラートを一時停止しています"
              : " "
          }
          size="small"
        />
        <TextField
          label="下限価格"
          type="number"
          value={targetLow}
          onChange={(e) => setTargetLow(e.target.value)}
          onFocus={() => setFocusedField("low")}
          onBlur={() => setFocusedField(null)}
          helperText={
            focusedField === "low"
              ? "入力中はアラートを一時停止しています"
              : " "
          }
          size="small"
        />
      </Box>

      <FormControlLabel
        control={
          <Switch
            checked={autoReset}
            onChange={(e) => setAutoReset(e.target.checked)}
            size="small"
          />
        }
        label="上限・下限自動更新"
        sx={{ mt: 1 }}
      />

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
