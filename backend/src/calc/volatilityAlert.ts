import {
  loadVolatilitySettings,
  upsertVolatilitySetting,
} from "../db/alertSettings.js";
import type { CryptoSymbol } from "../types.js";

/**
 * 1つの接続に対するボラティリティアラートの設定の型
 */
type VolatilityAlertState = {
  windowSec: number;
  threshold: number;
};

/**
 * ソケット接続ごとのボラティリティアラート設定の型
 */
type SocketVolatilityState = {
  userId: number;
  settings: Partial<Record<CryptoSymbol, VolatilityAlertState>>;
};

// socketId をキーとしたボラティリティアラート設定のMap
const volatilitySettingStates = new Map<string, SocketVolatilityState>();

/**
 * 接続時：DBから設定を読み込んでMapを初期化する
 * @param socketId ソケット接続ID
 * @param userId ユーザID
 * @returns Promise
 */
export async function initVolatilityState(socketId: string, userId: number) {
  const rows = await loadVolatilitySettings(userId);
  const settings: Partial<Record<CryptoSymbol, VolatilityAlertState>> = {};
  for (const row of rows) {
    settings[row.symbol] = {
      windowSec: row.window_sec,
      threshold: row.threshold,
    };
  }
  volatilitySettingStates.set(socketId, { userId, settings });
}

/**
 * saveVolatilityAlertイベント受信時：DBに設定を保存し、Mapも更新する。
 * @param socketId ソケット接続ID
 * @param symbol 銘柄名
 * @param windowSec ボラティリティアラートの監視ウィンドウ(秒)
 * @param threshold 閾値
 * @returns Promise
 */
export async function saveVolatilitySetting(
  socketId: string,
  symbol: CryptoSymbol,
  windowSec: number,
  threshold: number,
) {
  const state = volatilitySettingStates.get(socketId);
  if (!state) return;
  await upsertVolatilitySetting(state.userId, symbol, windowSec, threshold);
  state.settings[symbol] = { windowSec, threshold };
}

/**
 * disconnect時：Mapからエントリを削除する
 */
export function removeVolatilityState(socketId: string) {
  volatilitySettingStates.delete(socketId);
}

/**
 * ボラティリティアラートの監視ウィンドウを取得する。
 * 設定がない場合はデフォルト値を返す。
 * @param socketId ソケット接続ID
 * @param symbol 銘柄名
 * @param defaultSec デフォルトの監視ウィンドウ(秒)
 * @returns 監視ウィンドウ(秒)
 */
export function getVolatilityWindowSec(
  socketId: string,
  symbol: CryptoSymbol,
  defaultSec: number,
): number {
  return (
    volatilitySettingStates.get(socketId)?.settings[symbol]?.windowSec ??
    defaultSec
  );
}

/**
 * ボラティリティアラートの判定処理。
 * 閾値を超えていればtrueを返す。
 * @param socketId ソケット接続ID
 * @param symbol 銘柄名
 * @param changePercent 価格変動率
 * @returns ボラティリティアラート発火の有無
 */
export function checkVolatilityAlert(
  socketId: string,
  symbol: CryptoSymbol,
  changePercent: number | null,
): boolean {
  if (changePercent === null) return false;
  const setting = volatilitySettingStates.get(socketId)?.settings[symbol];
  if (!setting) return false;
  return Math.abs(changePercent) >= setting.threshold;
}

/**
 * alertSettingsLoaded送信用：ボラティリティ設定値を返す
 * @param socketId ソケット接続ID
 * @returns ボラティリティアラートの設定値
 */
export function getVolatilitySettings(socketId: string) {
  const state = volatilitySettingStates.get(socketId);
  if (!state) return {};
  const result: Partial<
    Record<CryptoSymbol, { windowSec: number; threshold: number }>
  > = {};
  for (const [sym, vs] of Object.entries(state.settings) as [
    CryptoSymbol,
    VolatilityAlertState,
  ][]) {
    result[sym] = { windowSec: vs.windowSec, threshold: vs.threshold };
  }
  return result;
}
