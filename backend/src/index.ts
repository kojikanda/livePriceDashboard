import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
// Socket.ioはExpressを直接使えないため、HTTPサーバーをラップする
const httpServer = createServer(app);
// WebSocket通信サーバ
const io = new Server(httpServer, {
  // CORS設定。現状は全ポートを許可。
  cors: { origin: "*" },
});

const interval = setInterval(() => {
  const price = Math.floor(Math.random() * 10000) + 90000;
  // 全クライアントに送る
  io.emit("btcPrice", { price });
}, 1000);

// 接続されたときの動作
io.on("connection", (socket) => {
  console.log("クライアント接続:", socket.id);

  socket.on("disconnect", () => {
    clearInterval(interval);
    console.log("クライアント切断:", socket.id);
  });
});

// listen実施
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
