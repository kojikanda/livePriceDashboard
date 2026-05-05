import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Snackbar,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { socket } from "../lib/socket";
import { useDashboard } from "../hooks/useDashboard";
import { useUsdJpyRate } from "../hooks/useUsdJpyRate";
import { useCurrentPrices } from "../hooks/useCurrentPrices";
import type { CryptoSymbol, PortfolioRow } from "../types/price";

/**
 * ポジション追加・削除・全削除のいずれかの操作を表す型
 * - add: ポジション追加。expectedCountは、追加後のportfolioの件数がこの値になればバックエンド側で処理が完了したと判断する。
 * - remove: ポジション削除。idは、削除するポジションのID。このIDが消えればバックエンド側で処理が完了したと判断する。
 * - clear: 全削除。portfolioの件数が0になればバックエンド側で処理が完了したと判断する。
 */
type PendingOp =
  | { type: "add"; expectedCount: number }
  | { type: "remove"; id: string }
  | { type: "clear" };

/**
 * 指定された値を日本円表示フォーマットの文字列(小数点以下なし, 3桁区切り)に変換する
 * @returns 日本円表示フォーマット文字列
 */
function fmtJpy(n: number) {
  return n.toLocaleString("ja-JP", { maximumFractionDigits: 0 });
}

/**
 * 指定された銘柄に対する小数点以下の桁数を返す
 * @param symbol 銘柄の文字列
 * @returns 小数点以下の桁数
 */
function coinDecimals(symbol: CryptoSymbol): number {
  switch (symbol) {
    case "BTC":
      return 8;
    case "ETH":
      return 6;
    case "SOL":
      return 4;
  }
}

/**
 * 仮想ポートシミュレータコンポーネント
 * @returns 仮想ポートシミュレータコンポーネント
 */
export function PortfolioSimulator() {
  // コンテキストから受信データを取得
  const { payload } = useDashboard();

  // 選択中の銘柄
  const [selectedSymbol, setSelectedSymbol] = useState<CryptoSymbol>("BTC");
  // 入力中の投資金額（文字列）
  const [investAmount, setInvestAmount] = useState("");
  // 買い方向
  const [direction, setDirection] = useState<"long" | "short">("long");

  // 受信データからポートフォリオ行データを取得
  const rows: PortfolioRow[] = payload?.portfolio ?? [];
  // 仮想購入・削除・全削除のいずれかの操作がバックエンドで完了するまでの間、処理中の操作を設定するstate
  const [pendingOp, setPendingOp] = useState<PendingOp | null>(null);

  // バックエンドのレスポンスを確認する処理
  useEffect(() => {
    if (!payload || !pendingOp) return;
    const portfolio = payload.portfolio;

    const confirmed =
      pendingOp.type === "add"
        ? // 追加処理完了の条件は、portfolioの件数がexpectedCount以上になること
          portfolio.length >= pendingOp.expectedCount
        : pendingOp.type === "remove"
          ? // 削除処理完了の条件は、portfolioから該当IDの行が消えること
            !portfolio.some((r) => r.id === pendingOp.id)
          : // 全削除処理完了の条件は、portfolioが空になること
            portfolio.length === 0;

    // バックエンド側で処理完了が確認できたら、pendingOpをnullにしてSnackbarを閉じる
    if (confirmed) setPendingOp(null);
  }, [payload, pendingOp]);

  // 現在価格取得用カスタムフック
  const currentPrices = useCurrentPrices();
  // 米ドル日本円レート取得用カスタムフック
  const {
    rate: usdJpyRate,
    loading: rateLoading,
    error: rateError,
  } = useUsdJpyRate();

  // DataGridの型定義
  const columns: GridColDef[] = [
    {
      field: "symbol",
      headerName: "銘柄",
      width: 80,
    },
    {
      field: "direction",
      headerName: "方向",
      width: 90,
      renderCell: (params) => (params.value === "long" ? "ロング" : "ショート"),
    },
    {
      field: "entryPriceUsd",
      headerName: "購入価格($)",
      width: 130,
      renderCell: (params) => `$${Number(params.value).toLocaleString()}`,
    },
    {
      field: "investedJpy",
      headerName: "投資額(円)",
      width: 120,
      renderCell: (params) => `¥${fmtJpy(params.value)}`,
    },
    {
      field: "coinAmount",
      headerName: "保有数量",
      width: 160,
      renderCell: (params) =>
        `${Number(params.value).toFixed(coinDecimals(params.row.symbol))} ${params.row.symbol}`,
    },
    {
      field: "currentValueJpy",
      headerName: "評価額(円)",
      width: 120,
      renderCell: (params) =>
        params.value !== null ? `¥${fmtJpy(params.value)}` : "---",
    },
    {
      field: "profitLoss",
      headerName: "含み損益(円)",
      width: 140,
      renderCell: (params) => {
        if (params.value === null) return "---";
        const color = params.value >= 0 ? "success.main" : "error.main";
        const sign = params.value >= 0 ? "+" : "";
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography variant="body2" sx={{ color }}>
              {sign}
              {fmtJpy(params.value)}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "profitLossRate",
      headerName: "騰落率(%)",
      width: 110,
      renderCell: (params) => {
        if (params.value === null) return "---";
        const color = params.value >= 0 ? "success.main" : "error.main";
        const sign = params.value >= 0 ? "+" : "";
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography variant="body2" sx={{ color }}>
              {sign}
              {Number(params.value).toFixed(2)}%
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "settlement",
      headerName: "操作",
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            height: "100%",
            width: "100%",
          }}
        >
          <Button
            variant="outlined"
            size="small"
            color="error"
            onClick={() => {
              // クリックしたときに処理中の操作をセットしてSnackbarを表示する
              setPendingOp({ type: "remove", id: params.row.id });
              // クリックしたときに該当ポジションのIDをバックエンドへ送信して削除する
              socket.emit("removePosition", { id: params.row.id });
            }}
            disabled={pendingOp !== null}
          >
            決済
          </Button>
        </Box>
      ),
    },
  ];

  // 仮想購入実行メソッド
  const handleBuy = () => {
    const price = currentPrices[selectedSymbol];
    if (price === null || usdJpyRate === null) return;
    const jpy = Number(investAmount);
    if (isNaN(jpy) || jpy <= 0) return;

    // バックエンドへ購入イベントを送信する前に、処理中の操作をセットしてSnackbarを表示する
    setPendingOp({ type: "add", expectedCount: rows.length + 1 });

    // バックエンドへ購入イベントを送信
    socket.emit("addPosition", {
      symbol: selectedSymbol,
      direction,
      investedJpy: jpy,
      entryPriceUsd: price,
      usdJpyRate,
      coinAmount: jpy / (price * usdJpyRate),
    });
    setInvestAmount("");
  };

  /* サマリー計算（rows から導出） */
  // 合計投資額
  const totalInvested = rows.reduce((sum, r) => sum + r.investedJpy, 0);
  // 合計損益
  const totalProfitLoss = rows.every((r) => r.profitLoss !== null)
    ? rows.reduce((sum, r) => sum + (r.profitLoss ?? 0), 0)
    : null;
  // 選択された銘柄の現在価格
  const selectedPrice = currentPrices[selectedSymbol];

  // Snackbar表示中かどうか
  const snackbarOpen = pendingOp !== null;
  // Snackbarに表示するメッセージ
  const snackbarMessage =
    pendingOp?.type === "add"
      ? "購入リクエストを送信しました。反映をお待ちください..."
      : pendingOp?.type === "remove"
        ? "決済リクエストを送信しました。反映をお待ちください..."
        : "全決済リクエストを送信しました。反映をお待ちください...";

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        {/* レート表示 */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {rateLoading
            ? "USD/JPY レート取得中..."
            : rateError
              ? `レート取得エラー: ${rateError}`
              : `USD/JPY: ${usdJpyRate?.toFixed(2)}`}
        </Typography>

        {/* 購入フォーム */}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "flex-start",
            mb: 2,
            flexWrap: "wrap",
          }}
        >
          {/* 銘柄選択 */}
          <ToggleButtonGroup
            value={selectedSymbol}
            exclusive
            onChange={(_, val) => {
              if (val !== null) setSelectedSymbol(val);
            }}
            size="small"
          >
            <ToggleButton value="BTC">BTC</ToggleButton>
            <ToggleButton value="ETH">ETH</ToggleButton>
            <ToggleButton value="SOL">SOL</ToggleButton>
          </ToggleButtonGroup>

          {/* 方向選択 */}
          <ToggleButtonGroup
            value={direction}
            exclusive // 1つだけ選択可能
            onChange={(_, val) => {
              if (val !== null) setDirection(val);
            }}
            size="small"
          >
            <ToggleButton value="long" color="success">
              ロング（買い）
            </ToggleButton>
            <ToggleButton value="short" color="error">
              ショート（売り）
            </ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label="投資金額（日本円）"
            variant="outlined"
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 1 } }}
            value={investAmount}
            onChange={(e) => setInvestAmount(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={handleBuy}
            disabled={
              pendingOp !== null ||
              selectedPrice === null ||
              investAmount === "" ||
              usdJpyRate === null
            }
          >
            仮想購入（{selectedSymbol}:{" "}
            {selectedPrice !== null
              ? `$${selectedPrice.toLocaleString()}`
              : "---"}
            ）
          </Button>
        </Box>

        {/* ポジション一覧 */}
        {rows.length > 0 && (
          <>
            <DataGrid
              rows={rows}
              columns={columns}
              autoHeight
              disableRowSelectionOnClick
              hideFooter // ページネーション非表示
              sx={{ mb: 2 }}
            />

            {/* サマリー */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                合計投資額: ¥{fmtJpy(totalInvested)}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color:
                    totalProfitLoss === null
                      ? "text.primary"
                      : totalProfitLoss >= 0
                        ? "success.main"
                        : "error.main",
                }}
              >
                合計損益:{" "}
                {totalProfitLoss !== null
                  ? `${totalProfitLoss >= 0 ? "+" : ""}${fmtJpy(totalProfitLoss)} 円`
                  : "---"}
              </Typography>
            </Box>

            {/* 全決済ボタン */}
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => {
                // バックエンドへ全削除イベントを送信する前に、処理中の操作をセットしてSnackbarを表示する
                setPendingOp({ type: "clear" });
                // クリックしたときに全削除の操作をセットしてSnackbarを表示する
                socket.emit("clearPositions");
              }}
              // disabled を追加
              disabled={pendingOp !== null}
            >
              全決済（一括清算）
            </Button>
          </>
        )}
      </CardContent>

      <Snackbar
        open={snackbarOpen}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="info" variant="filled">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Card>
  );
}
