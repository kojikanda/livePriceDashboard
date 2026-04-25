import { useState, useEffect, useReducer } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useUsdJpyRate } from "../hooks/useUsdJpyRate";

// ポジションの型定義
type Position = {
  // DataGridの各行のID
  id: string;
  // 投資金額
  investedJpy: number;
  // 購入時の銘柄価格
  btcPriceUsd: number;
  // 米ドル・日本円のレート
  usdJpyRate: number;
  // 購入数
  btcAmount: number;
  // 買い方向(ロング/ショート)
  direction: "long" | "short";
};

// 複数ポジションに対する操作の種類
type Action =
  | { type: "ADD"; payload: Position }
  | { type: "REMOVE"; id: string }
  | { type: "CLEAR" };

/**
 * 複数のポジションに対する操作を定義したreducerメソッド
 * @param state 現在のstate
 * @param action 操作(ADD: 追加(購入), REMOVE: 削除(決済), CLEAR: クリア(全決済))
 * @returns 操作後のstate
 */
function reducer(state: Position[], action: Action): Position[] {
  switch (action.type) {
    case "ADD":
      return [...state, action.payload];
    case "REMOVE":
      return state.filter((p) => p.id !== action.id);
    case "CLEAR":
      return [];
  }
}

/**
 * 指定された値を日本円表示フォーマットの文字列(小数点以下なし, 3桁区切り)に変換する
 */
function fmtJpy(n: number) {
  return n.toLocaleString("ja-JP", { maximumFractionDigits: 0 });
}

// Props
type Props = {
  currentPrice: number | null;
};

/**
 * 仮想ポートシミュレータコンポーネント
 * @param props.currentPrice 現在の価格
 * @returns 仮想ポートシミュレータコンポーネント
 */
export function PortfolioSimulator({ currentPrice }: Props) {
  // 入力中の投資金額（文字列）
  const [investAmount, setInvestAmount] = useState("");
  // 買い方向
  const [direction, setDirection] = useState<"long" | "short">("long");

  // 保有ポジション（localStorage で永続化）
  const [positions, dispatch] = useReducer(reducer, [], (): Position[] => {
    const saved = localStorage.getItem("btc_positions");
    return saved ? (JSON.parse(saved) as Position[]) : [];
  });

  // positionsが変わるたびにlocalStorageへ保存
  useEffect(() => {
    localStorage.setItem("btc_positions", JSON.stringify(positions));
  }, [positions]);

  // 米ドル日本円レート取得カスタムフック
  const {
    rate: usdJpyRate,
    loading: rateLoading,
    error: rateError,
  } = useUsdJpyRate();

  // DataGridの型定義
  const columns: GridColDef[] = [
    {
      field: "direction",
      headerName: "方向",
      width: 90,
      renderCell: (params) => (params.value === "long" ? "ロング" : "ショート"),
    },
    {
      field: "btcPriceUsd",
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
      field: "btcAmount",
      headerName: "保有数量(BTC)",
      width: 150,
      renderCell: (params) => Number(params.value).toFixed(8),
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
            onClick={() => dispatch({ type: "REMOVE", id: params.row.id })}
          >
            決済
          </Button>
        </Box>
      ),
    },
  ];

  // 仮想購入実行メソッド
  const handleBuy = () => {
    if (currentPrice === null || usdJpyRate === null) return;
    const jpy = Number(investAmount);
    if (isNaN(jpy) || jpy <= 0) return;

    const newPosition: Position = {
      id: crypto.randomUUID(),
      investedJpy: jpy,
      btcPriceUsd: currentPrice,
      usdJpyRate: usdJpyRate,
      btcAmount: jpy / (currentPrice * usdJpyRate),
      direction,
    };
    dispatch({ type: "ADD", payload: newPosition });
    setInvestAmount("");
  };

  // DataGrid に渡す行データ（計算済み損益を含む）
  const rows = positions.map((p) => {
    // 現在保有分の評価額
    const currentValueJpy =
      currentPrice !== null ? p.btcAmount * currentPrice * p.usdJpyRate : null;

    // 含み損益
    const profitLoss =
      currentPrice !== null
        ? p.direction === "long"
          ? (currentPrice - p.btcPriceUsd) * p.btcAmount * p.usdJpyRate
          : (p.btcPriceUsd - currentPrice) * p.btcAmount * p.usdJpyRate
        : null;

    // 騰落率
    const profitLossRate =
      profitLoss !== null ? (profitLoss / p.investedJpy) * 100 : null;

    return { ...p, currentValueJpy, profitLoss, profitLossRate };
  });

  // 合計損益
  const totalProfitLoss =
    currentPrice !== null
      ? rows.reduce((sum, r) => sum + (r.profitLoss ?? 0), 0)
      : null;

  // 合計投資額
  const totalInvested = positions.reduce((sum, p) => sum + p.investedJpy, 0);

  // 平均取得単価（保有数量で加重平均）
  const totalBtcAmount = positions.reduce((sum, p) => sum + p.btcAmount, 0);
  const avgBtcPriceUsd =
    totalBtcAmount > 0
      ? positions.reduce((sum, p) => sum + p.btcPriceUsd * p.btcAmount, 0) /
        totalBtcAmount
      : null;

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          仮想ポートフォリオ
        </Typography>

        {/* レート表示 */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {rateLoading
            ? "USD/JPY レート取得中..."
            : rateError
              ? `レート取得エラー: ${rateError}`
              : `USD/JPY: ${usdJpyRate?.toFixed(2)}`}
        </Typography>

        {/* 購入フォーム */}
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", mb: 2 }}>
          {/* 方向選択 */}
          <ToggleButtonGroup
            value={direction}
            exclusive // 1つだけ選択可能
            onChange={(_, val) => {
              if (val !== null) setDirection(val); // null は選択解除なので無視
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
              currentPrice === null ||
              investAmount === "" ||
              usdJpyRate === null
            }
          >
            仮想購入
          </Button>
        </Box>

        {/* ポジション一覧 */}
        {positions.length > 0 && (
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
                平均取得単価:{" "}
                {avgBtcPriceUsd !== null
                  ? `$${avgBtcPriceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                  : "---"}
                ／合計投資額: ¥{fmtJpy(totalInvested)}
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
              onClick={() => dispatch({ type: "CLEAR" })}
            >
              全決済（一括清算）
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
