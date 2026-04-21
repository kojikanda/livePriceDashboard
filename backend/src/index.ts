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
// ボラティリティ監視ウィンドウ(秒)
const VOLATILITY_WINDOW_SEC = 60;
// ボラティリティアラート閾値(%)
// const VOLATILITY_THRESHOLD = 1.0;
const VOLATILITY_THRESHOLD = 0.05;
// 価格の履歴保持数
const PRICE_HISTORY_MAX = Math.ceil(
  (VOLATILITY_WINDOW_SEC * 1000) / BLOADCAST_CYCLE,
);

// Binance WebSocket APIのURL
const BINANCE_WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@trade";
// Binance WebSocket API用のWebSocket
// 単にデータを受け取るだけなので、wsを使う
const binanceWs = new WebSocket(BINANCE_WS_URL);

// 最新の価格
let latestPrice: number | null = null;
// 価格履歴キュー（直近VOLATILITY_WINDOW_SEC秒分）
const priceHistory: number[] = [];

// BinanceのAPIからデータを受信したときの処理
binanceWs.on("message", (data) => {
  // 最新の価格を保持する
  const parsed = JSON.parse(data.toString());
  latestPrice = parseFloat(parsed.p);
});

// ブロードキャスト周期毎にブロードキャストで最新価格等を送信する
setInterval(() => {
  if (latestPrice === null) return;

  // キューに追加し、最大保持件数を超えたら古いものを削除
  priceHistory.push(latestPrice);
  if (priceHistory.length > PRICE_HISTORY_MAX) {
    // 先頭（最も古い価格）を削除
    priceHistory.shift();
  }

  // 変動率の計算とアラート判定
  let volatilityAlert = false;
  let changePercent: number | null = null;

  if (priceHistory.length === PRICE_HISTORY_MAX) {
    // データが1分分揃った場合のみ計算
    const oldestPrice = priceHistory[0]!;
    changePercent = ((latestPrice - oldestPrice) / oldestPrice) * 100;
    if (Math.abs(changePercent) > VOLATILITY_THRESHOLD) {
      volatilityAlert = true;
    }
  }

  io.emit("btcPrice", { price: latestPrice, volatilityAlert, changePercent });
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
