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

const BINANCE_WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@trade";

// BinanceパブリックWebSocket APIへの接続メソッド
function connectBinance() {
  const binanceWs = new WebSocket(BINANCE_WS_URL);

  // BinanceのAPIからデータを受信したときの処理
  binanceWs.on("message", (data) => {
    const parsed = JSON.parse(data.toString());
    const price = parseFloat(parsed.p);
    io.emit("btcPrice", { price });
  });

  // BinanceのAPIでエラーが発生したときの処理
  binanceWs.on("error", (err) => {
    console.error("Binance WS error:", err.message);
  });

  // BinanceのAPIで切断したときの処理
  binanceWs.on("close", () => {
    console.log("Binance WS切断。3秒後に再接続します...");
    setTimeout(connectBinance, 3000);
  });
}

connectBinance();

// listen実施
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
