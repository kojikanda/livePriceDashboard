import { io } from "socket.io-client";

/**
 * バックグラウンドとの接続を行うsocket
 */
export const socket = io(import.meta.env.VITE_API_URL, {
  // CookieをSocket.io接続に含める
  withCredentials: true,
  // 未認証状態でSocket.ioの接続が動作すると、バックグラウンドで弾かれるため、
  // ログイン後にio.connectを呼び出して、手動で接続する方式とする
  autoConnect: false,
  // WebSocketのみを使うようにする
  transports: ["websocket"],
});
