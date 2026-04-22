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
