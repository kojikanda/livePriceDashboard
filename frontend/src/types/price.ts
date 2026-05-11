/**
 * 価格情報
 */
export type PriceData = {
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
 * ターゲット価格アラートが発火したときの情報
 */
export type TargetAlertInfo = {
  side: "high" | "low";
  price: number;
  newHigh?: number;
  newLow?: number;
};

/**
 * バックエンドから受信する1銘柄分のデータ
 */
export type DashboardSymbolData = {
  // 現在価格
  currentPrice: number;
  // 価格履歴
  priceHistory: PriceData[];
  // センチメント集計結果
  sentimentResults: Record<SentimentWindow, SentimentResult>;
  // 騰落率サマリーの配列
  priceChanges: PriceChangeSummary[];
  // ボラティリティスコア
  volatilityScore: number | null;
  // 騰落率
  changePercent: number | null;
  // ターゲット価格アラートの発火情報(アラート発生時のみ)
  targetAlertInfo?: TargetAlertInfo;
  // ボラティリティアラートの発火フラグ(アラート発生時のみ)
  volatilityAlertFired?: boolean;
};

/**
 * バックエンドから受信した全銘柄分のデータ
 */
export type DashboardPayload = Record<CryptoSymbol, DashboardSymbolData> & {
  portfolio: PortfolioRow[];
};

/**
 * バックエンドから受信するアラート設定情報
 */
export type AlertSettingsPayload = {
  // ターゲット価格アラートの設定値
  targetAlerts: Partial<
    Record<
      CryptoSymbol,
      {
        targetHigh: number | null;
        targetLow: number | null;
        autoReset: boolean;
      }
    >
  >;
  // ボラティリティアラートの設定値
  volatilitySettings: Partial<
    Record<
      CryptoSymbol,
      {
        windowSec: number;
        threshold: number;
      }
    >
  >;
};

/**
 * 仮想ポートフォリオシミュレータ1行分のデータ
 */
export type PortfolioRow = {
  // ポジションID（UUID）
  id: string;
  // 銘柄
  symbol: CryptoSymbol;
  // 買い方向
  direction: "long" | "short";
  // 投資金額（円）
  investedJpy: number;
  // 購入時の価格（USD）
  entryPriceUsd: number;
  // 購入時のUSD/JPYレート
  usdJpyRate: number;
  // 保有数量
  coinAmount: number;
  // 現在の評価額（円）。価格未取得の場合は null
  currentValueJpy: number | null;
  // 含み損益（円）。価格未取得の場合は null
  profitLoss: number | null;
  // 騰落率（%）。価格未取得の場合は null
  profitLossRate: number | null;
};
