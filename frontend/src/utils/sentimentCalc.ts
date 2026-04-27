import type {
  PriceData,
  SentimentResult,
  PriceChangeSummary,
} from "../types/price";

/** 騰落率を比較する時間軸の定義 */
const CHANGE_TARGETS: { label: string; minutesAgo: number }[] = [
  { label: "5分前", minutesAgo: 5 },
  { label: "15分前", minutesAgo: 15 },
  { label: "30分前", minutesAgo: 30 },
];

/**
 * 直近N回の価格更新から「上昇/下落/中立」の比率を計算する
 * @param history 価格履歴
 * @param windowSize 集計する更新回数
 * @returns センチメント（強気/弱気）の集計結果
 */
export function calcSentiment(
  history: PriceData[],
  windowSize: number,
): SentimentResult {
  // 比較には「N回分」ではなく「N+1件」のデータが必要（差分を取るため）
  const recent = history.slice(-(windowSize + 1));

  let upCount = 0;
  let downCount = 0;
  let neutralCount = 0;

  for (let i = 1; i < recent.length; i++) {
    const diff = recent[i]!.price - recent[i - 1]!.price;
    if (diff > 0) upCount++;
    else if (diff < 0) downCount++;
    else neutralCount++;
  }

  const directionalTotal = upCount + downCount;
  //   console.log(
  //     `upCount=${upCount} downCount=${downCount} neutralCount=${neutralCount}`,
  //   );

  return {
    upCount,
    downCount,
    neutralCount,
    upRatio: directionalTotal > 0 ? upCount / directionalTotal : 0,
    downRatio: directionalTotal > 0 ? downCount / directionalTotal : 0,
    windowSize,
  };
}

/**
 * 「5分前」「15分前」「30分前」との騰落率を計算する
 * @param history 価格履歴
 * @param currentPrice 現在の価格
 * @param now 現在時刻のミリ秒
 */
export function calcPriceChanges(
  history: PriceData[],
  currentPrice: number,
  now: number = Date.now(),
): PriceChangeSummary[] {
  return CHANGE_TARGETS.map(({ label, minutesAgo }) => {
    const targetTimestamp = now - minutesAgo * 60 * 1000;

    // targetTimestamp以前で最も新しいエントリを探す
    const candidate = history
      .filter((d) => d.timestamp <= targetTimestamp)
      .slice(-1)[0];

    if (!candidate) {
      return { label, minutesAgo, pct: null };
    }

    const pct = ((currentPrice - candidate.price) / candidate.price) * 100;
    return { label, minutesAgo, pct };
  });
}
