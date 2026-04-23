import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import type { PriceData } from "../types/price";

type Props = {
  symbol: string;
  data: PriceData[];
  durationMin: number;
  onDurationChange: (min: number) => void;
};

/**
 * 価格表示グラフコンポーネント
 * @param props.symbol 銘柄のシンボル
 * @param props.data 価格情報の配列
 * @param props.durationMin グラフの表示期間(分)
 * @param props.onDurationChange グラフの表示期間変更時にコールするイベントハンドラ
 * @returns 価格表示グラフコンポーネント
 */
export function PriceChart({
  symbol,
  data,
  durationMin,
  onDurationChange,
}: Props) {
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
      {/* ヘッダー行 */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography variant="h6">{symbol} Price Chart</Typography>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>期間</InputLabel>
          <Select
            value={durationMin}
            label="期間"
            onChange={(e) => onDurationChange(Number(e.target.value))}
          >
            <MenuItem value={5}>5分</MenuItem>
            <MenuItem value={15}>15分</MenuItem>
            <MenuItem value={30}>30分</MenuItem>
          </Select>
        </FormControl>
      </Box>
      {/* グラフ */}
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
