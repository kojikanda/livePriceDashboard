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
import type {
  PriceData,
  SentimentWindow,
  DashboardPayload,
  DashboardSymbolData,
  SentimentResult,
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
 * @returns ダッシュボードに表示するデータ, データ不足などで生成できない場合はnull
 */
function buildSymbolData(symbol: string): DashboardSymbolData | null {
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
    changePercent: calcChangePercent(history, DEFAULT_VOLATILITY_WINDOW_SEC),
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

  const btc = buildSymbolData("BTC");
  const eth = buildSymbolData("ETH");
  const sol = buildSymbolData("SOL");
  if (!btc || !eth || !sol) return;

  const payload: DashboardPayload = { BTC: btc, ETH: eth, SOL: sol };

  // 個別送信で全クライアントに送信する
  // io.sockets.sockets は現在接続中の全ソケットのMap
  for (const [, socket] of io.sockets.sockets) {
    socket.emit("dashboardUpdate", payload);
  }
}, BLOADCAST_CYCLE);

// ユーザから接続されたときの動作
io.on("connection", (socket) => {
  console.log("クライアント接続:", socket.id);

  socket.on("disconnect", () => {
    console.log("クライアント切断:", socket.id);
  });
});

// listen実施
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
