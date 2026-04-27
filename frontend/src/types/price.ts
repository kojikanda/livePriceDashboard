/**
 * 価格情報
 */
export type PriceData = {
  time: string;
  price: number;
  timestamp: number;
};

/**
 * 銘柄情報
 */
export type PriceStreamOptions = {
  symbol: string;
  maxHistory: number;
  volatilityWindowSec: number;
  volatilityThreshold: number;
};

/**
 * サーバから受信するデータの型
 */
export type PricePayload = {
  price: number;
};

/**
 * センチメント（強気/弱気）の集計結果
 */
export type SentimentResult = {
  // 価格が上がった回数
  upCount: number;
  // 価格が下がった回数
  downCount: number;
  // 価格が上下動しなかった回数
  neutralCount: number;
  // 価格が上がった割合(上昇と下降のみの比較による割合, 0〜1)
  upRatio: number;
  // 価格が下がった割合(上昇と下降のみの比較による割合, 0〜1)
  downRatio: number;
  // 集計した更新回数
  windowSize: number;
};

/**
 * 騰落率サマリーの1件
 */
export type PriceChangeSummary = {
  // 騰落率サマリーのラベル(例: 5分前)
  label: string;
  // 比較対象の時間(何分前か)
  minutesAgo: number;
  // 騰落率(%)
  pct: number | null;
};
