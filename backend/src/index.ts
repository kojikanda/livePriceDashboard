import "./env.js";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import WebSocket from "ws";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.js";
import { applySocketAuthMiddleware } from "./auth/middleware.js";
import { calcSentiment, calcPriceChanges } from "./calc/sentiment.js";
import { calcVolatilityScore, calcChangePercent } from "./calc/volatility.js";
import {
  initTargetAlertState,
  saveTargetAlertState,
  pauseTargetAlert,
  removeTargetAlertState,
  checkTargetAlert,
  getTargetAlertSettings,
} from "./calc/targetAlert.js";
import {
  initVolatilityState,
  saveVolatilitySetting,
  removeVolatilityState,
  getVolatilityWindowSec,
  checkVolatilityAlert,
  getVolatilitySettings,
} from "./calc/volatilityAlert.js";
import type {
  PriceData,
  SentimentWindow,
  DashboardPayload,
  DashboardSymbolData,
  SentimentResult,
  CryptoSymbol,
  AlertSettingsPayload,
} from "./types.js";

const app = express();
// Socket.ioはExpressを直接使えないため、HTTPサーバーをラップする
const httpServer = createServer(app);
// WebSocket通信サーバ
const io = new Server(httpServer, {
  // CORS設定
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

// Socket.IOの認証ミドルウェアを適用
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
// JSONリクエストのパース
app.use(express.json());
// クッキーのパース
app.use(cookieParser());
// 認証関連のルーティングを追加
app.use("/auth", authRouter);

// Socket.io認証ミドルウェアを適用
applySocketAuthMiddleware(io);

// ブロードキャスト周期(msec)
const BLOADCAST_CYCLE = 5000;
// Binance WebSocket APIのURL
const BINANCE_WS_URL =
  "wss://stream.binance.com:9443/stream?streams=btcusdt@trade/ethusdt@trade/solusdt@trade";

/*
 * Binance APIのcombined stream受信データ例
 * {
 *   "stream": "btcusdt@trade",
 *   "data": { "p": "95000.00", ... }
 * }
 */
// ストリーム名（"btcusdt@trade"の前半部分）→ 銘柄名のマッピング
const SYMBOL_MAP: Record<string, string> = {
  btcusdt: "BTC",
  ethusdt: "ETH",
  solusdt: "SOL",
};

// 銘柄名のリスト
const SYMBOLS = ["BTC", "ETH", "SOL"] as const;
// センチメント集計のウィンドウサイズのリスト
const SENTIMENT_WINDOWS: SentimentWindow[] = [10, 50, 100, 300];
// 1時間分の履歴を保持するための最大データ数
const HISTORY_MAX = Math.ceil((60 * 60 * 1000) / BLOADCAST_CYCLE) + 1;
// チャート表示用（30分分）
const CHART_HISTORY_MAX = Math.ceil((30 * 60 * 1000) / BLOADCAST_CYCLE) + 1;
// デフォルト監視ウィンドウ（秒）
const DEFAULT_VOLATILITY_WINDOW_SEC = 60;

// 銘柄ごとの最新価格
const latestPrices: Record<string, number> = {};
// 銘柄ごとの価格履歴
const priceHistories: Record<string, PriceData[]> = {
  BTC: [],
  ETH: [],
  SOL: [],
};

// ソケットIDをキーとしたアラート状態のMap
const socketAlertStates = new Map<string, SocketAlertState>();

// Binance WebSocket API用のWebSocket
// 単にデータを受け取るだけなので、wsを使う
const binanceWs = new WebSocket(BINANCE_WS_URL);

// BinanceのAPIからデータを受信したときの処理
binanceWs.on("message", (data) => {
  // 最新の価格を保持する
  const parsed = JSON.parse(data.toString());
  // combined stream は { stream: "btcusdt@trade", data: { p: "..." } } の形式
  const streamName = parsed.stream as string;
  const symbolKey = streamName.split("@")[0];
  if (!symbolKey) return;
  const symbol = SYMBOL_MAP[symbolKey];
  if (symbol) {
    latestPrices[symbol] = parseFloat(parsed.data.p);
  }
});

/**
 * 1銘柄分のダッシュボードデータを組み立てる
 * @param symbol 銘柄名
 * @param windowSec ボラティリティアラートの監視ウィンドウ(秒)
 * @returns ダッシュボードに表示するデータ, データ不足などで生成できない場合はnull
 */
function buildSymbolData(
  symbol: CryptoSymbol,
  windowSec: number,
): DashboardSymbolData | null {
  const currentPrice = latestPrices[symbol];
  if (currentPrice === undefined) return null;

  const history = priceHistories[symbol] ?? [];

  const sentimentResults = Object.fromEntries(
    SENTIMENT_WINDOWS.map((w) => [w, calcSentiment(history, w)]),
  ) as Record<SentimentWindow, SentimentResult>;

  return {
    currentPrice,
    priceHistory: history.slice(-CHART_HISTORY_MAX),
    sentimentResults,
    priceChanges: calcPriceChanges(history, currentPrice),
    volatilityScore: calcVolatilityScore(history),
    changePercent: calcChangePercent(history, windowSec),
  };
}

// ブロードキャスト周期毎にブロードキャストで最新価格等を送信する
setInterval(() => {
  // 最新価格が全銘柄分揃っていない場合はスキップする
  if (!SYMBOLS.every((s) => s in latestPrices)) return;

  const now = Date.now();

  // ブロードキャスト周期ごとに価格を履歴に追記する
  for (const symbol of SYMBOLS) {
    const price = latestPrices[symbol];
    if (price === undefined) continue;
    const history = priceHistories[symbol];
    if (!history) continue;
    history.push({
      price,
      timestamp: now,
      time: new Date(now).toLocaleTimeString(),
    });
    if (history.length > HISTORY_MAX) history.shift();
  }

  // ユーザごとに個別送信
  for (const [socketId, socket] of io.sockets.sockets) {
    // ソケットのIDからアラートの情報を取得する
    const alertState = socketAlertStates.get(socketId);

    const symbolDataMap: Partial<Record<CryptoSymbol, DashboardSymbolData>> =
      {};
    for (const symbol of SYMBOLS) {
      // ダッシュボードに表示するデータを組み立てる
      const windowSec =
        alertState?.volatilitySettings?.[symbol]?.windowSec ??
        DEFAULT_VOLATILITY_WINDOW_SEC;
      const data = buildSymbolData(symbol, windowSec);
      if (!data) continue;

      // アラート判定結果をペイロードに組み込む
      if (alertState) {
        const currentPrice = latestPrices[symbol];
        if (currentPrice !== undefined) {
          // ターゲット価格アラートの判定
          const targetAlertInfo = checkTargetAlert(
            symbol,
            currentPrice,
            alertState,
          );
          if (targetAlertInfo) data.targetAlertInfo = targetAlertInfo;

          // ボラティリティアラートの判定
          const volSetting = alertState.volatilitySettings[symbol];
          if (
            volSetting &&
            data.changePercent !== null &&
            Math.abs(data.changePercent) >= volSetting.threshold
          ) {
            data.volatilityAlertFired = true;
          }
        }
      }

      symbolDataMap[symbol] = data;
    }

    // 全銘柄分のデータが揃っている場合のみ送信する
    if (SYMBOLS.every((s) => s in symbolDataMap)) {
      socket.emit("dashboardUpdate", symbolDataMap as DashboardPayload);
    }
  }
}, BLOADCAST_CYCLE);

// ユーザから接続されたときの動作
io.on("connection", (socket) => {
  console.log("クライアント接続:", socket.id);

  const userId = socket.data.userId as number;

  // DBからアラート設定を読み込み、メモリに展開する
  const [targetRows, volRows] = await Promise.all([
    loadTargetAlerts(userId),
    loadVolatilitySettings(userId),
  ]);

  const alertState: SocketAlertState = {
    userId,
    targetAlerts: {},
    volatilitySettings: {},
  };

  for (const row of targetRows) {
    alertState.targetAlerts[row.symbol] = {
      targetHigh: row.target_high,
      targetLow: row.target_low,
      autoReset: row.auto_reset,
      firedHigh: false,
      firedLow: false,
      paused: false,
    };
  }

  for (const row of volRows) {
    alertState.volatilitySettings[row.symbol] = {
      windowSec: row.window_sec,
      threshold: row.threshold,
    };
  }

  socketAlertStates.set(socket.id, alertState);

  // フロントエンドに初期設定値を送信する
  const settingsPayload: AlertSettingsPayload = {
    targetAlerts: Object.fromEntries(
      Object.entries(alertState.targetAlerts).map(([sym, ta]) => [
        sym,
        {
          targetHigh: ta!.targetHigh,
          targetLow: ta!.targetLow,
          autoReset: ta!.autoReset,
        },
      ]),
    ) as AlertSettingsPayload["targetAlerts"],
    volatilitySettings: Object.fromEntries(
      Object.entries(alertState.volatilitySettings).map(([sym, vs]) => [
        sym,
        { windowSec: vs!.windowSec, threshold: vs!.threshold },
      ]),
    ) as AlertSettingsPayload["volatilitySettings"],
  };
  socket.emit("alertSettingsLoaded", settingsPayload);

  // ターゲット価格アラート設定の保存
  socket.on(
    "saveTargetAlert",
    async (data: {
      symbol: CryptoSymbol;
      targetHigh: number | null;
      targetLow: number | null;
      autoReset: boolean;
    }) => {
      const { symbol, targetHigh, targetLow, autoReset } = data;
      await upsertTargetAlert(userId, symbol, targetHigh, targetLow, autoReset);

      // メモリも更新する（既存フラグは維持し、paused は解除）
      const existing = alertState.targetAlerts[symbol];
      alertState.targetAlerts[symbol] = {
        targetHigh,
        targetLow,
        autoReset,
        firedHigh: existing?.firedHigh ?? false,
        firedLow: existing?.firedLow ?? false,
        paused: false, // onBlur = 入力完了なので解除
      };
    },
  );

  // ボラティリティアラート設定の保存
  socket.on(
    "saveVolatilityAlert",
    async (data: {
      symbol: CryptoSymbol;
      windowSec: number;
      threshold: number;
    }) => {
      const { symbol, windowSec, threshold } = data;
      await upsertVolatilitySetting(userId, symbol, windowSec, threshold);
      alertState.volatilitySettings[symbol] = { windowSec, threshold };
    },
  );

  // 入力中（onFocus）：アラート判定を一時停止
  socket.on("alertInputFocus", (data: { symbol: CryptoSymbol }) => {
    const ta = alertState.targetAlerts[data.symbol];
    if (ta) ta.paused = true;
  });

  socket.on("disconnect", () => {
    socketAlertStates.delete(socket.id);
    console.log("クライアント切断:", socket.id);
  });
});

// listen実施
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
