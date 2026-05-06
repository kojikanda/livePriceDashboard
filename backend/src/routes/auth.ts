import { Router } from "express";
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db/client.js";
import { signToken, verifyToken } from "../auth/jwt.js";

/**
 * 認証関連のルーティングを定義するExpress Router
 */
const router = Router();

/**
 * クッキーのオプション設定
 */
const COOKIE_OPTIONS = {
  httpOnly: true,
  // 本番環境では、VercelとRenderを使うので、sameSiteは"none"に設定し、異なるドメインでもCookieを設定できるようにする。
  // その際、secureはtrueにし、必ずHTTPS通信となるようにする。
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as
    | "none"
    | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
};

/**
 * ユーザ登録
 */
router.post("/register", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "メールアドレスとパスワードは必須です" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "パスワードは8文字以上で入力してください" });
    return;
  }

  try {
    // パスワードをハッシュ化して、ユーザの情報をusersテーブルに保存
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email, passwordHash],
    );

    // 登録成功 - JWTトークンを生成してクッキーにセットし、ユーザ情報を返す
    const user = result.rows[0];
    const token = signToken({ userId: user.id, email: user.email });
    res.cookie("jwt", token, COOKIE_OPTIONS);
    res.status(201).json({ userId: user.id, email: user.email });
  } catch (err: any) {
    if (err.code === "23505") {
      // PostgreSQLのUNIQUE制約違反のエラーコード
      res
        .status(409)
        .json({ error: "このメールアドレスは既に登録されています" });
      return;
    }
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

/**
 * ログイン
 */
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "メールアドレスとパスワードは必須です" });
    return;
  }

  try {
    // 入力されたメールアドレスに対応するユーザをデータベースから取得し、パスワードを検証
    const result = await pool.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email],
    );
    const user = result.rows[0];
    // ユーザが存在しない場合とパスワードが一致しない場合を区別しない（セキュリティ上）
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res
        .status(401)
        .json({ error: "メールアドレスまたはパスワードが正しくありません" });
      return;
    }

    // ログイン成功 - JWTトークンを生成してクッキーにセットし、ユーザ情報を返す
    const token = signToken({ userId: user.id, email: user.email });
    res.cookie("jwt", token, COOKIE_OPTIONS);
    res.json({ userId: user.id, email: user.email });
  } catch {
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
});

/**
 * ログアウト
 */
router.post("/logout", (_req: Request, res: Response) => {
  // クッキーからJWTトークンを削除してログアウト
  res.clearCookie("jwt");
  res.json({ message: "ログアウトしました" });
});

/**
 * 認証確認（ページリロード時にフロントエンドから呼ぶ）
 */
router.get("/me", (req: Request, res: Response) => {
  // クッキーからJWTトークンを取得
  const token = req.cookies["jwt"];
  if (!token) {
    res.status(401).json({ error: "未認証" });
    return;
  }

  // JWTトークンを検証してユーザ情報を返す
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "トークンが無効です" });
    return;
  }
  res.json({ userId: payload.userId, email: payload.email });
});

export default router;
