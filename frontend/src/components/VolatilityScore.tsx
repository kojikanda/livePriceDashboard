import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Gauge, gaugeClasses } from "@mui/x-charts/Gauge";

/** ボラティリティスコア算出対象のデータ数 */
export const VOLATILITY_WINDOW_SIZE = 30;

/** アラートを出す閾値 */
const ALERT_THRESHOLD = 80;

/**
 * ボラティリティスコアに対応する色を返す
 * @param score ボラティリティスコア
 * @returns スコアに対応する色
 */
function getScoreColor(score: number): string {
  if (score <= 20) return "#2196f3"; // 青（低ボラ）
  if (score <= 60) return "#4caf50"; // 緑（通常）
  if (score <= 80) return "#ff9800"; // オレンジ（警戒）
  return "#f44336"; // 赤（高ボラ）
}

/**
 * ボラティリティスコアに応じたラベルを返す
 * @param score ボラティリティスコア
 * @returns スコアに対応するラベル
 */
function getScoreLabel(score: number): string {
  if (score <= 20) return "Low（低ボラティリティ）";
  if (score <= 60) return "Normal（通常）";
  if (score <= 80) return "Elevated（警戒）";
  return "High（高ボラティリティ）";
}

type Props = {
  volatilityScore: number | null;
};

/**
 * ボラティリティ・スコアコンポーネント
 * @param props.volatilityScore ボラティリティスコア
 * @returns ボラティリティ・スコアコンポーネント
 */
export function VolatilityScore({ volatilityScore }: Props) {
  const score = volatilityScore;

  // アラート発生有無
  const isAlert = score !== null && score > ALERT_THRESHOLD;
  // スコアに対応する色
  const color = score !== null ? getScoreColor(score) : "#9e9e9e";

  return (
    <Card
      sx={{
        mt: 2,
        border: isAlert
          ? "2px solid #f44336"
          : "1px solid rgba(255,255,255,0.12)",
        bgcolor: isAlert ? "rgba(244, 67, 54, 0.08)" : "background.paper",
        transition: "border 0.3s ease, background-color 0.3s ease",
      }}
    >
      <CardContent>
        {/* ヘッダー行 */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          {isAlert && (
            <Chip
              icon={<WarningAmberIcon />}
              label="High Volatility Alert"
              color="error"
              size="small"
              variant="filled"
            />
          )}
        </Box>

        {/* ゲージ + スコア */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
          {score !== null ? (
            <Gauge
              value={score}
              valueMin={0}
              valueMax={100}
              startAngle={-110}
              endAngle={110}
              width={180}
              height={120}
              sx={{
                [`& .${gaugeClasses.valueArc}`]: {
                  fill: color,
                  transition: "fill 0.5s ease",
                },
                [`& .${gaugeClasses.referenceArc}`]: {
                  fill: "rgba(255,255,255,0.1)",
                },
              }}
            />
          ) : (
            <Typography color="text.secondary" sx={{ width: 180 }}>
              計算中...
            </Typography>
          )}

          <Box>
            <Typography
              variant="h3"
              sx={{ color, fontWeight: "bold", transition: "color 0.5s ease" }}
            >
              {score ?? "--"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              直近 {VOLATILITY_WINDOW_SIZE} 件 / 標準偏差ベース
            </Typography>
            {score !== null && (
              <Typography
                variant="caption"
                sx={{ color, mt: 0.5, display: "block" }}
              >
                {getScoreLabel(score)}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
