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

## 3. アラート機能、リアルタイムチャートの追加

```
次に「アラート機能」と「リアルタイムチャート」を追加します。以下の機能を実装してください。

1. 目標価格の設定 (MUIを使用):

「上限価格 (Target High)」と「下限価格 (Target Low)」の2つの入力フィールドを作成してください。
現在価格がどちらかの価格に到達した際、MUIの Snackbar で通知を出してください。

2. リアルタイムチャート (Rechartsを使用):

直近 30件〜50件 程度の価格データを保持し、折れ線グラフで表示してください。
WebSocketで新しい価格が届くたびに、グラフが右側に更新されていくようにしてください。

3. 考慮事項:

グラフの再描画が重くならないよう、データの保持件数を制限するロジックを入れてください。
TypeScriptの型定義を適切に行ってください。

取得する価格の対象は、「BTC」としてください。
後々、他の銘柄にも対応する予定ですので、他の銘柄に対応する際、再利用可能な実装としてください。
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

# 仮想通貨について

## ■BTCとBTCUSDTの違い

BTC（Bitcoin）はビットコインそのものを指すのに対し、BTCUSDTは「ビットコインとテザー（USDT）のペア」を指す。<br>
主な違いは、BTCは資産そのもの、BTCUSDTは暗号資産取引所での取引ペア。
BTCUSDTは高い流動性を持ち、安定的に取引できる。

### BTCとBTCUSDTの主な違い

- 定義:
  - BTC (Bitcoin): 分散型デジタル通貨の基盤技術そのもの。
  - BTCUSDT: 米ドルにペグ（連動）されたステーブルコイン「Tether (USDT)」を用いた取引ペア。
- 用途:
  - BTC: 保有（ガチホ）、投資、送金、決済。
  - BTCUSDT: 短期トレード、利益確定（ボラティリティの回避）。
- 特徴:
  - BTC: 価格変動が激しい。
  - BTCUSDT: 暗号資産市場で最も流動性が高いペアの1つ。24時間365日取引され、安定した取引環境を提供。

### どちらを選ぶべきか

- 長期間の保有（ホールド）や、ビットコインの価値そのものを信じる場合は「BTC」。
- 頻繁なトレーディング、価格変動が激しい局面での安定した換金（利益確定）を目的とする場合は「BTCUSDT」。

# Reactの実装

## ■コンポーネント

- ResponsiveContainer → Rechartsライブラリでグラフの幅や高さを親要素に合わせて自動調整するコンポーネント

## ■プロパティ

### ◯Recharts

- interval="preserveStartEnd" → グラフの軸（ラベル）の表示領域が狭くなった場合に、自動で中間ラベルを間引き、最初と最後のラベル（Start/End）を必ず残して表示する。
- tick={{ fontSize: 11 }} → グラフのX軸やY軸に表示される目盛りやラベルの設定
- domain={[min - padding, max + padding]} → グラフの軸の範囲（最小値と最大値）を定義するプロパティ
- stroke="rgba(255,255,255,0.87)" → 折れ線や円グラフの枠線、レーダーチャートの線などの色を指定するSVG風のprops
