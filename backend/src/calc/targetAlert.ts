import { loadTargetAlerts, upsertTargetAlert } from "../db/alertSettings.js";
import type { CryptoSymbol, TargetAlertInfo } from "../types.js";

/**
 * 1つの接続に対するターゲット価格アラートの状態の型
 */
type TargetAlertState = {
  targetHigh: number | null;
  targetLow: number | null;
  autoReset: boolean;
  firedHigh: boolean;
  firedLow: boolean;
  paused: boolean;
};

/**
 * ソケット接続ごとのターゲット価格アラート状態の型
 */
type SocketTargetState = {
  userId: number;
  alerts: Partial<Record<CryptoSymbol, TargetAlertState>>;
};

// 自動再設定のオフセット率（現在価格の±1%）
const OFFSET_RATE = 0.01;

// socketId をキーとしたターゲット価格アラート状態のMap
const targetAlertStates = new Map<string, SocketTargetState>();

/**
 * 接続時：DBから設定を読み込んでMapを初期化する
 * @param socketId ソケット接続ID
 * @param userId ユーザID
 * @returns Promise
 */
export async function initTargetAlertState(socketId: string, userId: number) {
  const rows = await loadTargetAlerts(userId);
  const alerts: Partial<Record<CryptoSymbol, TargetAlertState>> = {};
  for (const row of rows) {
    alerts[row.symbol] = {
      targetHigh: row.target_high,
      targetLow: row.target_low,
      autoReset: row.auto_reset,
      firedHigh: false,
      firedLow: false,
      paused: false,
    };
  }
  targetAlertStates.set(socketId, { userId, alerts });
}

/**
 * saveTargetAlertイベント受信時：DBに設定を保存し、Mapも更新する。
 * firedHigh/firedLow は既存の値を引き継ぐ（再設定で即アラートを防ぐため）。
 * @returns Promise
 */
export async function saveTargetAlertState(
  socketId: string,
  symbol: CryptoSymbol,
  targetHigh: number | null,
  targetLow: number | null,
  autoReset: boolean,
) {
  const state = targetAlertStates.get(socketId);
  if (!state) return;
  await upsertTargetAlert(
    state.userId,
    symbol,
    targetHigh,
    targetLow,
    autoReset,
  );
  const existing = state.alerts[symbol];
  state.alerts[symbol] = {
    targetHigh,
    targetLow,
    autoReset,
    firedHigh: existing?.firedHigh ?? false,
    firedLow: existing?.firedLow ?? false,
    paused: false,
  };
}

/**
 * alertInputFocusイベント受信時：アラート判定を一時停止する
 * @param socketId ソケット接続ID
 * @param symbol 銘柄シンボル
 */
export function pauseTargetAlert(socketId: string, symbol: CryptoSymbol) {
  const ta = targetAlertStates.get(socketId)?.alerts[symbol];
  if (ta) ta.paused = true;
}

/**
 * disconnect時：Mapからエントリを削除する
 * @param socketId ソケット接続ID
 */
export function removeTargetAlertState(socketId: string) {
  targetAlertStates.delete(socketId);
}

/**
 * ターゲット価格アラート判定処理。
 * 発火した場合はTargetAlertInfoを返し、発火しない場合はundefinedを返す。
 * @param socketId ソケット接続ID
 * @param symbol 銘柄シンボル
 * @param currentPrice 現在価格
 * @returns ターゲット価格アラートの情報
 */
export function checkTargetAlert(
  socketId: string,
  symbol: CryptoSymbol,
  currentPrice: number,
): TargetAlertInfo | undefined {
  const state = targetAlertStates.get(socketId);
  const ta = state?.alerts[symbol];
  if (!ta || ta.paused) return undefined;

  // 上限チェック
  if (ta.targetHigh !== null) {
    if (currentPrice >= ta.targetHigh && !ta.firedHigh) {
      // 上限アラート発火時はアラート発生の情報を返す
      ta.firedHigh = true;
      return updateAndCreateTargetAlertInfo(
        state.userId,
        symbol,
        currentPrice,
        ta,
        true,
      );
    } else if (currentPrice < ta.targetHigh) {
      ta.firedHigh = false;
    }
  }

  // 下限チェック
  if (ta.targetLow !== null) {
    if (currentPrice <= ta.targetLow && !ta.firedLow) {
      // 下限アラート発火時はアラート発生の情報を返す
      ta.firedLow = true;
      return updateAndCreateTargetAlertInfo(
        state.userId,
        symbol,
        currentPrice,
        ta,
        false,
      );
    } else if (currentPrice > ta.targetLow) {
      ta.firedLow = false;
    }
  }

  return undefined;
}

/**
 * ターゲット価格アラート発火時の処理：必要に応じて自動再設定も行い、アラート情報を返す
 * @param userId ユーザID
 * @param symbol 銘柄
 * @param currentPrice 現在価格
 * @param targetAlertState ターゲット価格アラートの状態
 * @param isHeight 上限アラートか下限アラートかのフラグ
 * @returns ターゲット価格アラートの情報
 */
function updateAndCreateTargetAlertInfo(
  userId: number,
  symbol: CryptoSymbol,
  currentPrice: number,
  targetAlertState: TargetAlertState,
  isHeight: boolean,
): TargetAlertInfo {
  const side = isHeight ? "high" : "low";

  if (targetAlertState.autoReset) {
    // 自動再設定ありのとき
    const newHigh = currentPrice * (1 + OFFSET_RATE);
    const newLow = currentPrice * (1 - OFFSET_RATE);
    targetAlertState.targetHigh = newHigh;
    targetAlertState.targetLow = newLow;
    void upsertTargetAlert(
      userId,
      symbol,
      newHigh,
      newLow,
      targetAlertState.autoReset,
    );
    return { side, price: currentPrice, newHigh, newLow };
  } else {
    // 自動再設定なしのとき
    return { side, price: currentPrice };
  }
}

/**
 * alertSettingsLoaded送信用：ターゲット価格アラートの設定値を返す
 * @param socketId ソケット接続ID
 * @returns ターゲット価格アラートの設定値
 */
export function getTargetAlertSettings(socketId: string) {
  const state = targetAlertStates.get(socketId);
  if (!state) return {};
  const result: Partial<
    Record<
      CryptoSymbol,
      {
        targetHigh: number | null;
        targetLow: number | null;
        autoReset: boolean;
      }
    >
  > = {};
  for (const [sym, ta] of Object.entries(state.alerts) as [
    CryptoSymbol,
    TargetAlertState,
  ][]) {
    result[sym] = {
      targetHigh: ta.targetHigh,
      targetLow: ta.targetLow,
      autoReset: ta.autoReset,
    };
  }
  return result;
}
