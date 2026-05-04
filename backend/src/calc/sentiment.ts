import type {
  PriceData,
  SentimentResult,
  PriceChangeSummary,
} from "../types.js";

/**
 * 直近N回の価格更新からセンチメント(価格上昇/下落の割合)を計算する
 * @param history 価格履歴
 * @param windowSize 集計する更新回数
 * @returns センチメントの集計結果
 */
export function calcSentiment(
  history: PriceData[],
  windowSize: number,
): SentimentResult {
  const recent = history.slice(-(windowSize + 1));
  let upCount = 0;
  let downCount = 0;
  let neutralCount = 0;

  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const curr = recent[i];
    if (!prev || !curr) continue;
    if (curr.price > prev.price) upCount++;
    else if (curr.price < prev.price) downCount++;
    else neutralCount++;
  }

  const directedTotal = upCount + downCount;
  const upRatio = directedTotal === 0 ? 0.5 : upCount / directedTotal;
  const downRatio = directedTotal === 0 ? 0.5 : downCount / directedTotal;

  return { upCount, downCount, neutralCount, upRatio, downRatio, windowSize };
}

/**
 * 「5分前」「15分前」「30分前」との騰落率を計算する
 * @param history 価格履歴
 * @param currentPrice 現在の価格
 * @param now 現在時刻のミリ秒
 * @returns 騰落率サマリーの配列
 */
export function calcPriceChanges(
  history: PriceData[],
  currentPrice: number,
  now: number = Date.now(),
): PriceChangeSummary[] {
  const targets = [
    { label: "5分前", minutesAgo: 5 },
    { label: "15分前", minutesAgo: 15 },
    { label: "30分前", minutesAgo: 30 },
  ];

  return targets.map(({ label, minutesAgo }) => {
    const cutoffMs = now - minutesAgo * 60 * 1000;
    // cutoff以前で最も新しいエントリを探す
    // ループ回数を少なくするため、後ろから前に向かって探し、最初に見つかったものを採用する
    let entry: PriceData | undefined;
    for (let i = history.length - 1; i >= 0; i--) {
      if ((history[i]?.timestamp ?? 0) <= cutoffMs) {
        entry = history[i];
        break;
      }
    }
    const pct =
      entry != null ? ((currentPrice - entry.price) / entry.price) * 100 : null;
    return { label, minutesAgo, pct };
  });
}
