import { io } from "socket.io-client";

/**
 * バックグラウンドとの接続を行うsocket
 */
export const socket = io("http://localhost:3001");
