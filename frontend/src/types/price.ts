/**
 * 価格情報
 */
export type PriceData = {
  // 価格データの時間文字列
  time: string;
  // 価格
  price: number;
  // 価格データのタイムスタンプ(ミリ秒)
  timestamp: number;
};

/**
 * 銘柄
 */
export type CryptoSymbol = "BTC" | "ETH" | "SOL";

/**
 * 銘柄情報
 */
export type PriceStreamOptions = {
  // 銘柄
  symbol: CryptoSymbol;
  // 価格の履歴数
  maxHistory: number;
  // ボラティリティアラートの監視ウィンドウ(秒)
  volatilityWindowSec: number;
  // ボラティリティアラートの閾値(%)
  volatilityThreshold: number;
};

/**
 * サーバから受信するデータの型（3銘柄分をまとめて受信）
 */
export type PricePayload = Record<CryptoSymbol, number>;

/**
 * センチメント(価格上昇/下落の割合)の集計結果
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

/**
 * センチメント集計ウィンドウの選択肢
 */
export const SENTIMENT_WINDOWS = [10, 50, 100, 300] as const;

/**
 * センチメント集計ウィンドウの選択肢の型
 */
export type SentimentWindow = (typeof SENTIMENT_WINDOWS)[number];

/**
 * バックエンドから受信する1銘柄分のデータ
 */
export type DashboardSymbolData = {
  currentPrice: number;
  priceHistory: PriceData[];
  sentimentResults: Record<SentimentWindow, SentimentResult>;
  priceChanges: PriceChangeSummary[];
  volatilityScore: number | null;
  changePercent: number | null;
};

/**
 * バックエンドから受信する全銘柄分のデータ
 */
export type DashboardPayload = Record<CryptoSymbol, DashboardSymbolData>;
