import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import WebSocket from "ws";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.js";
import { applySocketAuthMiddleware } from "./auth/middleware.js";

const app = express();
// Socket.ioはExpressを直接使えないため、HTTPサーバーをラップする
const httpServer = createServer(app);
// WebSocket通信サーバ
const io = new Server(httpServer, {
  // CORS設定
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

// Socket.IOの認証ミドルウェアを適用
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
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

// 銘柄ごとの最新価格
const latestPrices: Record<string, number> = {};

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

// ブロードキャスト周期毎にブロードキャストで最新価格等を送信する
setInterval(() => {
  // 全銘柄の価格が揃っていなければ送信しない
  if (
    !("BTC" in latestPrices && "ETH" in latestPrices && "SOL" in latestPrices)
  ) {
    return;
  }

  // ブロードキャスト送信
  io.emit("priceUpdate", latestPrices);
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
