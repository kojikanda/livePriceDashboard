import { parse } from "cookie";
import type { Server } from "socket.io";
import { verifyToken } from "./jwt.js";

/**
 * Socket.IOの認証ミドルウェアを適用する
 * @param io Socket.IOサーバーインスタンス
 */
export function applySocketAuthMiddleware(io: Server) {
  // クライアントからの接続時に認証を行うミドルウェア
  // (接続前に実行する処理を定義)
  io.use((socket, next) => {
    // クッキーからJWTトークンを取得
    // (ブラウザがSocket.io接続を試みる際、httpOnlyクッキーは自動的に接続リクエストのヘッダーに含まれる)
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) return next(new Error("認証が必要です"));

    // クッキーを解析してJWTトークンを取得
    const cookies = parse(cookieHeader);
    const token = cookies["jwt"];
    if (!token) return next(new Error("認証が必要です"));

    // JWTトークンを検証してペイロードを取得
    const payload = verifyToken(token);
    if (!payload) return next(new Error("トークンが無効です"));

    // 認証成功 - ソケットにユーザー情報を保存して次のミドルウェアへ
    socket.data.userId = payload.userId;
    socket.data.email = payload.email;
    next();
  });
}
