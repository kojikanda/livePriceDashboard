import type { PriceData } from "../types.js";

// ボラティリティスコア算出対象のデータ数
const VOLATILITY_WINDOW_SIZE = 30;

// このCV(%)がスコア100に相当する上限値。BTCの5秒足ではCV 0.5%超が「高ボラ」の目安。
const MAX_CV_PCT = 0.5;

/**
 * 直近N件の価格データからボラティリティスコア（0〜100）を算出する
 *
 * 算出方法:
 *   1. 直近N件の標準偏差を求める
 *   2. 変動係数（CV）= 標準偏差 ÷ 平均 × 100（%）を求める
 *   3. CV を 0〜100 のスコアに線形変換（MAX_CV_PCT が上限）
 *
 * @param history   価格履歴
 * @param windowSize 集計件数
 * @returns スコア（0〜100）, データ不足の場合はnull
 */
export function calcVolatilityScore(
  history: PriceData[],
  windowSize: number = VOLATILITY_WINDOW_SIZE,
): number | null {
  const recent = history.slice(-windowSize);
  if (recent.length < 2) return null;

  // 価格履歴から価格を取り出す
  const prices = recent.map((e) => e.price);
  // 平均値を算出
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  // 標準偏差を算出
  const variance =
    prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  // 変動係数（CV）を%で表現し、0〜100のスコアに変換して返す
  const cv = (stdDev / mean) * 100;
  return Math.min(100, Math.round((cv / MAX_CV_PCT) * 100));
}

/**
 * 指定秒数ウィンドウ内の変化率(%)を算出する
 * @param history 価格履歴
 * @param windowSec ウィンドウ秒数
 * @returns 変化率(%), データ不足の場合はnull
 *
 * 算出方法:
 *   1. ウィンドウ内で最も古い価格を探す
 *   2. 変化率 = (最新価格 - 古い価格) / 古い価格 * 100(%)
 */
export function calcChangePercent(
  history: PriceData[],
  windowSec: number,
): number | null {
  if (history.length < 2) return null;

  const now = Date.now();
  const cutoffMs = now - windowSec * 1000;

  // ウィンドウ内で最も古いエントリを末尾から探す
  // ループ回数を少なくするため、後ろから前に向かって探し、最初に見つかったものを採用する
  let oldest: PriceData | undefined;
  for (let i = history.length - 1; i >= 0; i--) {
    if ((history[i]?.timestamp ?? 0) < cutoffMs) break;
    oldest = history[i];
  }
  if (!oldest) return null;

  const current = history[history.length - 1];
  if (!current) return null;

  return ((current.price - oldest.price) / oldest.price) * 100;
}
