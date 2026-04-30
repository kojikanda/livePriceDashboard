import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * JWTのペイロードの型定義
 */
export type JwtPayload = {
  userId: number;
  email: string;
};

/**
 * JWTを生成する
 * @param payload ペイロード
 * @returns 生成されたJWTトークン
 */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * JWTを検証する
 * @param token トークン
 * @returns 検証結果
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
