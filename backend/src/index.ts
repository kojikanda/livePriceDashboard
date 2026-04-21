import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import WebSocket from "ws";

const app = express();
// Socket.ioはExpressを直接使えないため、HTTPサーバーをラップする
const httpServer = createServer(app);
// WebSocket通信サーバ
const io = new Server(httpServer, {
  // CORS設定。現状は全ポートを許可。
  cors: { origin: "*" },
});

// ブロードキャスト周期(msec)
const BLOADCAST_CYCLE = 5000;

// Binance WebSocket APIのURL
const BINANCE_WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@trade";
// Binance WebSocket API用のWebSocket
// 単にデータを受け取るだけなので、wsを使う
const binanceWs = new WebSocket(BINANCE_WS_URL);

// 最新の価格
let latestPrice: Number | null = null;

// BinanceのAPIからデータを受信したときの処理
binanceWs.on("message", (data) => {
  // 最新の価格を保持する
  const parsed = JSON.parse(data.toString());
  latestPrice = parseFloat(parsed.p);
});

// ブロードキャスト周期毎にブロードキャストで最新価格を送る
setInterval(() => {
  if (latestPrice !== null) {
    io.emit("btcPrice", { price: latestPrice });
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
