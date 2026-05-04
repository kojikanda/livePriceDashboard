import {
  loadVolatilitySettings,
  upsertVolatilitySetting,
} from "../db/alertSettings.js";
import type { CryptoSymbol } from "../types.js";

type VolatilityAlertState = {
  windowSec: number;
  threshold: number;
};

type SocketVolatilityState = {
  userId: number;
  settings: Partial<Record<CryptoSymbol, VolatilityAlertState>>;
};

// socketId をキーとしたボラティリティアラート設定のMap
const volatilitySettingStates = new Map<string, SocketVolatilityState>();

/**
 * 接続時：DBから設定を読み込んでMapを初期化する
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
 * saveVolatilityAlert イベント受信時：DB保存・状態更新
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
 * disconnect 時：Mapからエントリを削除する
 */
export function removeVolatilityState(socketId: string) {
  volatilitySettingStates.delete(socketId);
}

/**
 * interval 内でchangePercent計算用のwindowSecを返す
 * 設定がない場合はデフォルト値を返す
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
 * interval 内のアラート判定
 * 閾値を超えていれば true を返す
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
 * alertSettingsLoaded 送信用：ボラティリティ設定値を返す
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
