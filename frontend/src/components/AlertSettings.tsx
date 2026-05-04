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
import { socket } from "../lib/socket";
import { useDashboard } from "../hooks/useDashboard";
import type { CryptoSymbol } from "../types/price";

type Props = {
  symbol: CryptoSymbol;
};

/**
 * アラート設定・表示コンポーネント
 * @param props.symbol 銘柄のシンボル
 * @returns アラート設定・表示コンポーネント
 */
export function AlertSettings({ symbol }: Props) {
  // コンテキストからアラート設定とターゲット価格アラート発火イベントを取得
  const { alertSettings, targetAlertEvent } = useDashboard();
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

  // 一度だけ初期化するためのフラグ
  const initializedRef = useRef(false);

  // DBから読み込んだ設定で初期化する（接続後に1回だけ実行）
  useEffect(() => {
    if (initializedRef.current) return;
    const initial = alertSettings?.targetAlerts?.[symbol];
    if (!initial) return;

    setTargetHigh(initial.targetHigh != null ? String(initial.targetHigh) : "");
    setTargetLow(initial.targetLow != null ? String(initial.targetLow) : "");
    setAutoReset(initial.autoReset);
    initializedRef.current = true;
  }, [alertSettings, symbol]);

  // バックエンドからのアラート発火通知を受け取る
  useEffect(() => {
    if (!targetAlertEvent || targetAlertEvent.symbol !== symbol) return;

    const { side, price, newHigh, newLow } = targetAlertEvent;
    const limitStr = side === "high" ? "上限" : "下限";

    if (newHigh != null && newLow != null) {
      // 上限価格・下限価格再設定あり：フォームの表示値を新しい設定値に更新する
      setTargetHigh(newHigh.toFixed(2));
      setTargetLow(newLow.toFixed(2));
      setAlertMessage(
        `${symbol} が${limitStr}価格に到達（$${price.toLocaleString()}）→ ` +
          `次のアラートを $${newHigh.toLocaleString(undefined, { maximumFractionDigits: 2 })} / ` +
          `$${newLow.toLocaleString(undefined, { maximumFractionDigits: 2 })} に自動設定しました`,
      );
    } else {
      // 上限価格・下限価格再設定なし：フォームの表示値はそのままで、アラートメッセージのみ更新する
      setAlertMessage(
        `${symbol} が${limitStr}価格（$${price.toLocaleString()}）に到達しました`,
      );
    }
    setOpen(true);
    // targetAlertEvent.key の変化でのみ反応させる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetAlertEvent?.key, symbol]);

  // 上限価格・下限価格が確定したときに、バックエンドへ設定を送信する
  const emitSave = useCallback(() => {
    const high = targetHigh !== "" ? parseFloat(targetHigh) : null;
    const low = targetLow !== "" ? parseFloat(targetLow) : null;
    socket.emit("saveTargetAlert", {
      symbol,
      targetHigh: high,
      targetLow: low,
      autoReset,
    });
  }, [symbol, targetHigh, targetLow, autoReset]);

  // 上限価格の入力が確定したときの処理
  const handleHighBlur = useCallback(() => {
    setFocusedField(null);
    emitSave();
  }, [emitSave]);

  // 下限価格の入力が確定したときの処理
  const handleLowBlur = useCallback(() => {
    setFocusedField(null);
    emitSave();
  }, [emitSave]);

  // 自動再設定のON/OFFが切り替わったときの処理
  const handleAutoResetChange = useCallback(
    (checked: boolean) => {
      setAutoReset(checked);
      const high = targetHigh !== "" ? parseFloat(targetHigh) : null;
      const low = targetLow !== "" ? parseFloat(targetLow) : null;
      socket.emit("saveTargetAlert", {
        symbol,
        targetHigh: high,
        targetLow: low,
        autoReset: checked,
      });
    },
    [symbol, targetHigh, targetLow],
  );

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
          onFocus={() => {
            // 入力開始時にfocusedFieldを更新してアラートのチェックを一時停止するためのイベントを送信
            setFocusedField("high");
            socket.emit("alertInputFocus", { symbol });
          }}
          onBlur={handleHighBlur}
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
          onFocus={() => {
            // 入力開始時にfocusedFieldを更新してアラートのチェックを一時停止するためのイベントを送信
            setFocusedField("low");
            socket.emit("alertInputFocus", { symbol });
          }}
          onBlur={handleLowBlur}
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
            onChange={(e) => handleAutoResetChange(e.target.checked)}
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
