# Claude Codeへの指示

## 1. 最小構成の実装

```
React(MUI)とNode.jsを使用して、WebSocket（Socket.io）によるリアルタイム価格更新の最小構成を作成してください。

【構成】
- ルート直下に /frontend と /backend を作成
- 全て TypeScript を使用
- Frontend: Vite + React + MUI + socket.io-client
- Backend: Node.js + Express + socket.io + tsx(実行用)

【実装内容】
1. Backend側で 1秒ごとに「BTCの仮想価格」をランダム生成し、Socket.ioで配信する。
2. Frontend側でその値を受け取り、MUIのTypographyで表示する。
3. Renderにデプロイすることを想定し、Backendのポート番号は `process.env.PORT || 3001` とすること。

まずは必要なディレクトリ作成と、パッケージのインストールから始めてください。
```

## 2. BinanceのパブリックWebSocket APIの利用

```
次ですが、今、価格はランダムな値をNodejsで設定するようにしていますが、
これを、BinanceのパブリックWebSocket
APIに接続して、ビットコイン（BTCUSDT）の価格をブラウザ上に表示するようにしたいです。

もし、Binanceのユーザ登録などが必要でしたら、教えてください。
```

---

<br>

# TypeScript実行に関して

## ■tsxとは

tsxは、esbuildをベースにした高速なTypeScript実行環境（コマンド）。<br>
Node.js上で.tsや.tsxファイルを直接実行でき、ts-nodeの高速な代替として利用される。<br>
型チェックは行わないため、高速な動作が特徴。

### 主な特徴

- 高速な実行: ESBuildを利用して即座にコンパイルし、実行する。
- インストール: npm install -D tsx でプロジェクトに導入する。
- 実行: npx tsx script.ts
- Watchモード: tsx watch file.ts でファイル変更を検知し自動再実行。
- 互換性: Node.jsのコマンドオプションをサポート。
  ※型チェックが必要な場合は、tsc --noEmitと併用することが推奨される。

# Node.js実装

## ■ざっくりまとめ

- socket.emit() → サーバー・クライアント間でリアルタイムにデータ（イベント）を送信するメソッド

## ■ログ出力について

Node.js界隈では pino が現在のトレンド。

```typescript
import pino from "pino";

const logger = pino();

logger.info("Server running on port 3001"); // レベル: 情報
logger.warn("接続数が多い"); // レベル: 警告
logger.error("DB接続失敗"); // レベル: エラー
```

出力はJSON形式になる。

```json
{ "level": 30, "time": 1713600000000, "msg": "Server running on port 3001" }
```

### Renderでの実運用

RenderはJSON形式のログをそのまま受け取れるので、pinoとの相性が良い。<br>
ログレベルでフィルタリングしたり、外部のログ管理サービス（Datadog、Logtailなど）に転送することもできる。

# Binance WebSocket API

## ■@tradeストリーム

@tradeストリームで約定（実際の取引）が発生するたびにデータが届く。
受信するJSONの主なフィールドは以下。

```json
{
  "e": "trade", // イベント種別
  "s": "BTCUSDT", // シンボル
  "p": "95432.10", // 取引価格（文字列）
  "q": "0.001", // 取引数量
  "T": 1713600000000 // タイムスタンプ
}
```
