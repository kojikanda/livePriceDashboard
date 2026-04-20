import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Box, Typography } from "@mui/material";
import type { PriceData } from "../types/price";

type Props = {
  symbol: string;
  data: PriceData[];
};

/**
 * 価格表示グラフコンポーネント
 * @param props.symbol 銘柄のシンボル
 * @param props.data 価格情報の配列
 * @returns 価格表示グラフコンポーネント
 */
export function PriceChart({ symbol, data }: Props) {
  // 価格のリスト
  const prices = data.map((d) => d.price);
  // 価格の最小値
  const min = prices.length > 0 ? Math.min(...prices) : 0;
  // 価格の最大値
  const max = prices.length > 0 ? Math.max(...prices) : 100;
  // グラフ表示の上下に設定するパディング設定
  const padding = (max - min) * 0.1 || 500;

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        {symbol} Price Chart
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: "rgba(255,255,255,0.87)" }}
            stroke="rgba(255,255,255,0.87)"
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[min - padding, max + padding]}
            tick={{ fontSize: 11, fill: "rgba(255,255,255,0.87)" }}
            stroke="rgba(255,255,255,0.87)"
            width={80}
            tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
          />
          <Tooltip
            formatter={(value) => {
              if (typeof value !== "number") return [String(value), "Price"];
              return [`$${value.toLocaleString()}`, "Price"];
            }}
          />
          <Line
            type="linear"
            dataKey="price"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
