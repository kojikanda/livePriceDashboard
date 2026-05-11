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
 * ターゲット価格アラートの情報
 */
export type TargetAlertInfo = {
  // 発生方向
  side: "high" | "low";
  // ターゲット価格
  price: number;
  // 新たな上限価格(自動リセット時のみ)
  newHigh?: number;
  // 新たな下限価格(自動リセット時のみ)
  newLow?: number;
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

/**
 * センチメント集計ウィンドウの選択肢の型
 */
export type SentimentWindow = 10 | 50 | 100 | 300;

/**
 * 対応する暗号資産のシンボルの型
 */
export type CryptoSymbol = "BTC" | "ETH" | "SOL";

/**
 * ダッシュボードに表示する銘柄データの型
 */
export type DashboardSymbolData = {
  // 現在価格
  currentPrice: number;
  // 価格履歴
  priceHistory: PriceData[];
  // ターゲット価格アラートの情報(アラート発生時のみ)
  targetAlertInfo?: TargetAlertInfo;
  // ボラティリティアラートのアラート発生フラグ(アラート発生時のみ)
  volatilityAlertFired?: boolean;
  // センチメント(価格上昇/下落の割合)の集計結果
  sentimentResults: Record<SentimentWindow, SentimentResult>;
  // 騰落率サマリー
  priceChanges: PriceChangeSummary[];
  // ボラティリティスコア(0〜100, データ不足の場合はnull)
  volatilityScore: number | null;
  // 騰落率(%)(データ不足の場合はnull)
  changePercent: number | null;
};

/**
 * ダッシュボード全体のデータの型（3銘柄分＋仮想ポートフォリオシミュレータのデータ）
 */
export type DashboardPayload = Record<CryptoSymbol, DashboardSymbolData> & {
  portfolio: PortfolioRow[];
};

/**
 * alertSettingsLoaded イベントのペイロード（フロントエンドへの初期値配信）
 */
export type AlertSettingsPayload = {
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
  volatilitySettings: Partial<
    Record<CryptoSymbol, { windowSec: number; threshold: number }>
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
