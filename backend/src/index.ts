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
import {
  initPortfolioState,
  addPosition,
  removePosition,
  clearPortfolio,
  removePortfolioState,
  calcPortfolioRows,
} from "./calc/portfolio.js";
import type {
  PriceData,
  SentimentWindow,
  DashboardPayload,
  DashboardSymbolData,
  SentimentResult,
  CryptoSymbol,
  AlertSettingsPayload,
} from "./types.js";

// Expressアプリの作成
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

// Frankfurter APIのプロキシ設定
app.get("/frankfurter/latest", async (req, res) => {
  const { from, to } = req.query;
  const response = await fetch(
    `https://api.frankfurter.app/latest?from=${String(from)}&to=${String(to)}`,
  );
  const data = await response.json();
  res.json(data);
});

// Socket.io認証ミドルウェアを適用
applySocketAuthMiddleware(io);

// データ送信周期(msec)
const DATA_SEND_CYCLE = 5000;
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
const SYMBOLS: CryptoSymbol[] = ["BTC", "ETH", "SOL"];
// センチメント集計のウィンドウサイズのリスト
const SENTIMENT_WINDOWS: SentimentWindow[] = [10, 50, 100, 300];
// 1時間分の履歴を保持するための最大データ数
const HISTORY_MAX = Math.ceil((60 * 60 * 1000) / DATA_SEND_CYCLE) + 1;
// チャート表示用（30分分）
const CHART_HISTORY_MAX = Math.ceil((30 * 60 * 1000) / DATA_SEND_CYCLE) + 1;
// デフォルト監視ウィンドウ（秒）
const DEFAULT_VOLATILITY_WINDOW_SEC = 60;

// 銘柄ごとの最新価格
const latestPrices: Partial<Record<CryptoSymbol, number>> = {};
// 銘柄ごとの価格履歴
const priceHistories: Record<CryptoSymbol, PriceData[]> = {
  BTC: [],
  ETH: [],
  SOL: [],
};

// Binance WebSocket API用のWebSocket
// 単にデータを受け取るだけなので、wsを使う
const binanceWs = new WebSocket(BINANCE_WS_URL);

// BinanceのAPIからデータを受信したときの処理
binanceWs.on("message", (data) => {
  const parsed = JSON.parse(data.toString());
  const streamName = parsed.stream as string;
  const symbolKey = streamName.split("@")[0];
  if (!symbolKey) return;
  const symbol = SYMBOL_MAP[symbolKey];
  if (symbol) {
    latestPrices[symbol as CryptoSymbol] = parseFloat(parsed.data.p);
  }
});

/**
 * 1銘柄分のダッシュボードデータを組み立てる。
 * ターゲット価格アラートとボラティリティアラートの判定結果は含まない。
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
  const history = priceHistories[symbol];

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

// 定周期で全クライアントにデータを送信する
setInterval(() => {
  if (!SYMBOLS.every((s) => s in latestPrices)) return;

  const now = Date.now();

  // 全銘柄の価格を履歴に追記する（全ユーザ共通）
  for (const symbol of SYMBOLS) {
    const price = latestPrices[symbol];
    if (price === undefined) continue;
    const history = priceHistories[symbol];
    history.push({
      price,
      timestamp: now,
    });
    if (history.length > HISTORY_MAX) history.shift();
  }

  // 全ユーザ分のDB更新(Promise)を収集する
  const upsertTasks: Promise<void>[] = [];

  // ユーザごとに個別送信する
  for (const [socketId, socket] of io.sockets.sockets) {
    const symbolDataMap: Partial<Record<CryptoSymbol, DashboardSymbolData>> =
      {};

    for (const symbol of SYMBOLS) {
      // ユーザの設定に基づいて、送信データを組み立てる
      const windowSec = getVolatilityWindowSec(
        socketId,
        symbol,
        DEFAULT_VOLATILITY_WINDOW_SEC,
      );
      const data = buildSymbolData(symbol, windowSec);
      if (!data) continue;

      const currentPrice = latestPrices[symbol]!;

      // ターゲット価格アラートの判定結果を送信データに追加する
      const { alertInfo, upsertTask } = checkTargetAlert(
        socketId,
        symbol,
        currentPrice,
      );
      if (alertInfo) data.targetAlertInfo = alertInfo;
      // DB更新が必要な場合はPromiseをupsertTasksに追加する
      if (upsertTask) upsertTasks.push(upsertTask);

      // ボラティリティアラートの判定結果を送信データに追加する
      if (checkVolatilityAlert(socketId, symbol, data.changePercent)) {
        data.volatilityAlertFired = true;
      }

      symbolDataMap[symbol] = data;
    }

    // 全銘柄のデータが揃っている場合のみ、仮想ポートフォリオシミュレータのデータを追加して送信する
    if (SYMBOLS.every((s) => s in symbolDataMap)) {
      // 仮想ポートフォリオシミュレータの情報を作成
      const portfolio = calcPortfolioRows(socketId, latestPrices);

      // フロントエンドに送信
      socket.emit("dashboardUpdate", {
        ...(symbolDataMap as Record<CryptoSymbol, DashboardSymbolData>),
        portfolio,
      });
    }
  }

  // 収集した全てのDB更新(Promise)を並列実行する
  if (upsertTasks.length > 0) {
    void Promise.all(upsertTasks).catch(console.error);
  }
}, DATA_SEND_CYCLE);

// ユーザIDごとのアクティブなソケットID
const activeUserSockets = new Map<number, string>();

// ユーザから接続されたときの処理
io.on("connection", async (socket) => {
  console.log("クライアント接続:", socket.id);
  const userId = socket.data.userId as number;

  // 同じユーザが既に接続中なら旧ソケットに通知して切断
  const existingSocketId = activeUserSockets.get(userId);
  if (existingSocketId) {
    console.log("同じユーザからの接続を検知:", existingSocketId);
    const existingSocket = io.sockets.sockets.get(existingSocketId);
    if (existingSocket) {
      console.log("強制切断イベントを発行");
      existingSocket.emit("forceDisconnect", {
        reason: "別の端末からログインされました",
      });
      existingSocket.disconnect(true);
    }
  }

  // 新しいソケットを登録
  activeUserSockets.set(userId, socket.id);

  // DBからターゲット価格アラートとボラティリティアラートの設定を読み込んで、状態を初期化する
  await Promise.all([
    initTargetAlertState(socket.id, userId),
    initVolatilityState(socket.id, userId),
    initPortfolioState(socket.id, userId),
  ]).catch(console.error);

  // フロントエンドに初期設定値を送信する
  const settingsPayload: AlertSettingsPayload = {
    targetAlerts: getTargetAlertSettings(socket.id),
    volatilitySettings: getVolatilitySettings(socket.id),
  };
  socket.emit("alertSettingsLoaded", settingsPayload);

  // フロントエンドからターゲット価格アラートの設定保存イベントを受信したときの処理
  socket.on(
    "saveTargetAlert",
    async (data: {
      symbol: CryptoSymbol;
      targetHigh: number | null;
      targetLow: number | null;
      autoReset: boolean;
    }) => {
      saveTargetAlertState(
        socket.id,
        data.symbol,
        data.targetHigh,
        data.targetLow,
        data.autoReset,
      ).catch(console.error);
    },
  );

  // フロントエンドからボラティリティアラートの設定保存イベントを受信したときの処理
  socket.on(
    "saveVolatilityAlert",
    async (data: {
      symbol: CryptoSymbol;
      windowSec: number;
      threshold: number;
    }) => {
      saveVolatilitySetting(
        socket.id,
        data.symbol,
        data.windowSec,
        data.threshold,
      ).catch(console.error);
    },
  );

  // フロントエンドからアラート入力フォーカスイベントを受信したときの処理
  socket.on("alertInputFocus", (data: { symbol: CryptoSymbol }) => {
    pauseTargetAlert(socket.id, data.symbol);
  });

  // 仮想ポートフォリオシミュレータ: 購入イベントを受信したときの処理
  socket.on(
    "addPosition",
    (data: {
      symbol: CryptoSymbol;
      direction: "long" | "short";
      investedJpy: number;
      entryPriceUsd: number;
      usdJpyRate: number;
      coinAmount: number;
    }) => {
      addPosition(
        socket.id,
        data.symbol,
        data.direction,
        data.investedJpy,
        data.entryPriceUsd,
        data.usdJpyRate,
        data.coinAmount,
      ).catch(console.error);
    },
  );

  // 仮想ポートフォリオシミュレータ: 1件決済イベントを受信したときの処理
  socket.on("removePosition", (data: { id: string }) => {
    removePosition(socket.id, data.id).catch(console.error);
  });

  // 仮想ポートフォリオシミュレータ: 全決済イベントを受信したときの処理
  socket.on("clearPositions", () => {
    clearPortfolio(socket.id).catch(console.error);
  });

  // クライアントが切断されたときの処理
  socket.on("disconnect", () => {
    removeTargetAlertState(socket.id);
    removeVolatilityState(socket.id);
    removePortfolioState(socket.id);

    // 現在アクティブなソケットが自分自身の場合のみ削除
    if (activeUserSockets.get(userId) === socket.id) {
      activeUserSockets.delete(userId);
    }

    console.log("クライアント切断:", socket.id);
  });
});

// listen実施
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
