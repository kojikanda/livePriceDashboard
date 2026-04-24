import { useState } from "react";
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

// ポジションの型定義
type Position = {
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

// USD/JPYレート定義値
const USD_JPY_RATE = 150;

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
  const [position, setPosition] = useState<Position | null>(() => {
    const saved = localStorage.getItem("btc_position");
    return saved ? (JSON.parse(saved) as Position) : null;
  });

  // 仮想購入実行メソッド
  const handleBuy = () => {
    if (currentPrice === null) return;
    const jpy = Number(investAmount);
    if (isNaN(jpy) || jpy <= 0) return;

    const newPosition: Position = {
      investedJpy: jpy,
      btcPriceUsd: currentPrice,
      usdJpyRate: USD_JPY_RATE,
      btcAmount: jpy / (currentPrice * USD_JPY_RATE),
      direction: direction,
    };
    setPosition(newPosition);
    localStorage.setItem("btc_position", JSON.stringify(newPosition));
    setInvestAmount("");
  };

  // 決済（リセット）実行メソッド
  const handleReset = () => {
    setPosition(null);
    localStorage.removeItem("btc_position");
  };

  // 現在保有分の評価額
  const currentValueJpy =
    position !== null && currentPrice !== null
      ? position.btcAmount * currentPrice * position.usdJpyRate
      : null;

  // 含み損益
  const profitLoss =
    position !== null && currentPrice !== null
      ? position.direction === "long"
        ? (currentPrice - position.btcPriceUsd) *
          position.btcAmount *
          position.usdJpyRate
        : (position.btcPriceUsd - currentPrice) *
          position.btcAmount *
          position.usdJpyRate
      : null;

  // 騰落率
  const profitLossRate =
    profitLoss !== null && position !== null
      ? (profitLoss / position.investedJpy) * 100
      : null;

  // 損益の色（プラス→緑、マイナス→赤）
  const profitColor =
    profitLoss === null
      ? "text.primary"
      : profitLoss >= 0
        ? "success.main"
        : "error.main";

  // 日本円表示数値フォーマット（小数なし・3桁区切り）
  const fmtJpy = (n: number) =>
    n.toLocaleString("ja-JP", { maximumFractionDigits: 0 });

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          仮想ポートフォリオ
        </Typography>

        {position === null ? (
          // 購入フォーム
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
            {/* 方向選択 */}
            <ToggleButtonGroup
              value={direction}
              exclusive // 1つだけ選択可能
              onChange={(_, val) => {
                if (val !== null) setDirection(val); // null は選択解除なので無視
              }}
              size="small"
              sx={{ mb: 1 }}
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
              disabled={currentPrice === null || investAmount === ""}
            >
              仮想購入
            </Button>
          </Box>
        ) : (
          // 評価損益カード
          <Box>
            {/* 購入情報 */}
            <Typography variant="body2" color="text.secondary">
              [{position.direction === "long" ? "ロング" : "ショート"}]
              購入価格: ${position.btcPriceUsd.toLocaleString()} ／ 投資額: ¥
              {fmtJpy(position.investedJpy)} ／ 保有数量:{" "}
              {position.btcAmount.toFixed(8)} BTC
            </Typography>

            {/* 評価損益 */}
            <Typography variant="body1">
              現在の評価額:{" "}
              {currentValueJpy !== null ? `¥${fmtJpy(currentValueJpy)}` : "---"}
            </Typography>
            <Typography variant="body1" sx={{ color: profitColor }}>
              含み損益:{" "}
              {profitLoss !== null
                ? `${profitLoss >= 0 ? "+" : ""}${fmtJpy(profitLoss)} 円`
                : "---"}{" "}
              ／ 騰落率:{" "}
              {profitLossRate !== null
                ? `${profitLossRate >= 0 ? "+" : ""}${profitLossRate.toFixed(2)}%`
                : "---"}
            </Typography>

            <Button
              variant="outlined"
              color="error"
              size="small"
              sx={{ mt: 1.5 }}
              onClick={handleReset}
            >
              決済（リセット）
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
