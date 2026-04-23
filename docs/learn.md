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

→ グラフに表示できる期間が短いので、その後、5秒毎にBTC価格送信＆データ保持数: 100に変更

## 4. 価格急変検知（ボラティリティ・アラート）機能の追加

```
次に「価格急変検知（ボラティリティ・アラート）」機能を追加してください。

【バックエンドの実装要件】
1. 価格履歴の保持: サーバー側（Node.js）のメモリ上に、直近1分間分（ブロードキャストの間隔が5秒間隔なら12件）の価格を保持するキュー（配列）を作成してください。
  ・ブロードキャスト間隔は定義値: BLOADCAST_CYCLEにミリ秒単位で保持しています。
  ・直近1分間の「1分」は今後、画面からの設定によって変えられるようにする予定ですので、秒単位の値で、定義値にしてください。
2. 変動率の計算: ブロードキャスト間隔ごとの配信タイミングで、「現在の価格」と「1分前の価格」を比較し、変動率（％）を計算してください。
  ・計算式: ((現在価格 - 1分前価格) / 1分前価格) * 100
3. アラート判定: 変動率が ±1%を超えた場合、io.emit で送るデータに volatilityAlert: true と changePercent: 値 を含めてください。
  ・変動率の「1%」についても定義値としてください。

【フロントエンドの実装要件】
視覚的通知: volatilityAlert: true を受け取った際、画面上に「急激な価格変動を検知しました！」という警告（Snackbar）を表示してください。

履歴の表示: 現在の変動率（％）を、現在価格の横に小さく表示してください。

【考慮事項】
サーバー起動直後など、データが1分分溜まっていない間はアラート判定をスキップするようにしてください。
```

## 5. 価格変化による視覚的な変化に対応

```
UIを強化し、価格変化を直感的に伝える「視覚的効果」を追加してください。

【実装要件】

1. 価格のフラッシュ表示:
前回の価格と比較して、上がった場合は「緑」、下がった場合は「赤」に、現在価格のテキスト色を一瞬変化させてください。
CSSの transition を使い、変化した色が 1秒ほどかけてゆっくり元の色（白や黒）に戻るようにしてください。

2. アラート時の強調スタイル:
価格表示を行っている箇所はカードを使うよう、修正してください。
さらに、volatilityAlert: true を受け取っている間、価格を表示しているカード全体の境界線（Border）を赤く太くし、警告感を出してください。
可能であれば、カードの背景に薄い赤色の「パルスアニメーション（波打つような動き）」を加えてください。

3. トレンドアイコンの追加:
価格の横に、上昇中なら TrendingUp、下落中なら TrendingDown アイコン（MUI Icons）を表示してください。

4. MUIの活用:
これらのスタイルは、MUIの sx プロパティや styled-components の仕組みを使って、Reactらしい動的なスタイル制御で実装してください。

【考慮事項】
・5秒おき(ブロードキャスト周期)の更新タイミングで、パッと色が変わる「心地よさ」を重視してください。
・アニメーションがCPUに負荷をかけすぎないよう、シンプルな実装を心がけてください。
```

## 6. グラフ表示期間を変更可能に対応

```
グラフ表示期間を、ユーザーが時間（分）で選択できるように変更してください。

【実装要件】
1. MUIのSelectコンポーネントを追加:
・選択肢は「5分」「15分」「30分」の3種類。
・初期値は「5分」とします。

2.動的なMAX_HISTORY計算:
・バックエンドのブロードキャスト周期（5秒）に基づき、選択された時間から MAX_HISTORY（保持件数）を算出してください。

3. 配列の制御:
・期間設定が変更された際、保持している価格履歴配列（State）を、新しい MAX_HISTORY に合わせて適切に調整（長い場合はそのまま、短い場合は末尾から切り詰め）してください。(現状でもやっていると思いますが、念のため。)

【UI/UXの調整】
・セレクトボックスはグラフの右上に配置するなど、ダッシュボードらしいレイアウトにしてください。
  このとき、必要であれば、他のコンポーネントを含めて調整してください。
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

---

<br>

# Node.js実装

## ■WebSocket

### ◯Socket.ioとwsの違い

Node.jsにおけるSocket.ioとwsの主な違いは、機能の抽象化レベルと目的。<br>
wsは軽量・高速な純粋なWebSocket実装（RFC 6455）であり、Socket.ioは再接続機能やルーム管理などを含む高機能なリアルタイム通信ライブラリである。

- ws (WebSocket):
  - 特徴: 最小限のAPIで非常に高速。
  - 用途: パフォーマンス重視の単純な双方向通信。
  - 機能: WebSocket標準に準拠。自動再接続機能はない。

- Socket.io:
  - 特徴: 高機能。WebSocketをラップし、自動再接続、ルーム（チャットルーム）、ブロードキャスト機能を持つ。
  - 用途: チャット、マルチプレイヤーゲーム、リアルタイム通知。
  - 機能: 接続が切れた場合に自動的に再試行する。

### ◯Socket.ioの通信処理基本

#### ・基本構成

1. 接続（Connection）: io.on('connection', socket => { ... }) でクライアントの接続を検知。
1. イベントの受信（Receive）: socket.on('eventName', data => { ... }) でクライアントからデータを受け取る。
1. イベントの送信（Emit）: socket.emit('eventName', data) (接続元のみ) や io.emit(...) (全体) でデータを送信。

#### ・チャットアプリの実装例

```javascript
const io = require("socket.io")(3000); // 3000番ポートでサーバー起動

io.on("connection", (socket) => {
  console.log("ユーザーが接続しました");

  // メッセージ受信イベント
  socket.on("chat message", (msg) => {
    console.log("メッセージ受信: " + msg);
    // 全ユーザーにメッセージを送信
    io.emit("chat message", msg);
  });

  socket.on("disconnect", () => {
    console.log("ユーザーが切断しました");
  });
});
```

- io.emit → ブロードキャスト
- socket.emit → 接続元のみに対して送信

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

---

<br>

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

---

<br>

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

---

<br>

# Reactの実装

## ■コンポーネント

- ResponsiveContainer → Rechartsライブラリでグラフの幅や高さを親要素に合わせて自動調整するコンポーネント
- FormControl →フォーム入力要素（&lt;input&gt;、&lt;select&gt;など）にラベル、ヘルプメッセージ、エラーメッセージを自動的に紐付け、アクセシビリティ（WAI-ARIA）とレイアウトを一括管理するコンポーネント。
  - バリデーションの視覚化: エラー時に枠線を赤くし、メッセージを表示。
  - ヘルプテキストの付与: 入力形式の例（例: "YYYY/MM/DD"）を表示。
  - フォームの統一感: アプリ内の全フォームで配置やレイアウトを統一。
- InputLabel → フォーム入力項目（SelectやTextField）のラベルを表示・管理するコンポーネントです。FormControl配下で使用し、入力状態（フォーカス、エラーなど）に応じてラベルの動き（浮き上がり）を自動管理し、スタイルを統一する。
  - ラベルの動的表示: 入力フィールドが選択された時にラベルが上に浮き上がる（Floating label）アニメーション。
  - 状態管理: FormControlと連動し、入力エラー時にラベルを赤くするなど、バリデーション状態を反映。
  - アクセシビリティ: フォーム要素とラベルをidで関連付け。

## ■プロパティ

### ◯Recharts

- interval="preserveStartEnd" → グラフの軸（ラベル）の表示領域が狭くなった場合に、自動で中間ラベルを間引き、最初と最後のラベル（Start/End）を必ず残して表示する。
- tick={{ fontSize: 11 }} → グラフのX軸やY軸に表示される目盛りやラベルの設定
- domain={[min - padding, max + padding]} → グラフの軸の範囲（最小値と最大値）を定義するプロパティ
- stroke="rgba(255,255,255,0.87)" → 折れ線や円グラフの枠線、レーダーチャートの線などの色を指定するSVG風のprops

## ■CSS

- alignItems: "baseline" → フレックスコンテナ内の子要素を、要素内部のテキストのベースライン（文字の底辺）で揃える配置設定

## ■CSSアニメーションについて

### ◯@keyframesについて

MUI は内部で**Emotion**というCSSライブラリを使っており、@mui/systemのkeyframesを使うことで、通常のCSSの@keyframesをJavaScript上で定義できる。

```typescript
import { keyframes } from "@mui/system";

// 価格フラッシュ（緑：上昇）
const flashUp = keyframes`
    from { color: #4caf50; }                                                                           
    to   { color: inherit; }
  `;

// 価格フラッシュ（赤：下落）
const flashDown = keyframes`
    from { color: #f44336; }
    to   { color: inherit; }
  `;

// アラートカードのパルス
const pulseRed = keyframes`                                                                          
    0%   { background-color: rgba(244, 67, 54, 0.05); }
    50%  { background-color: rgba(244, 67, 54, 0.15); }                                                
    100% { background-color: rgba(244, 67, 54, 0.05); }
  `;
```

CSSの@keyframesは、Webページ上で要素のアニメーションにおける「途中経過（スタイル）」を定義するルール。<br>
開始（0%）から終了（100%）までの間、位置や色、大きさなどを細かく指定し、複雑な動きを自動で補間して作成できる。

#### 基本

```css
@keyframes アニメーション名 {
  0% {
    /* 開始時のスタイル */
  }
  50% {
    /* 中間点のスタイル */
  }
  100% {
    /* 終了時のスタイル */
  }
}
```

#### コード例

```css
/* 1. アニメーションを定義 */
@keyframes slideIn {
  0% {
    transform: translateX(-100px);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 2. 要素に適用 */
.box {
  animation: slideIn 1s ease-in-out forwards;
}
```

### ◯アニメーション再起動の「keyトリック」について

Reactでは、コンポーネントの**key**が変わると、そのコンポーネントは一度アンマウント（削除）されて再マウント（再作成）される。<br>
CSS アニメーションは「要素が生まれた瞬間」に開始されるので、**key**を変えることでアニメーションを強制的に再起動できる。

```typescript
// 価格が変わるたびに +1 されるカウンター
const [flashKey, setFlashKey] = useState(0);

{/* key が変わるたびに Box が再マウントされ、アニメーションが再起動する */}
<Box key={flashKey} sx={{ animation: `${flashUp} 1.5s ease forwards` }}>
  <Typography variant="h2">...</Typography>
</Box>
```

### ◯実際のCSS設定

```typescript
<Card
  sx={{
    mt: 2,
    border: showVolatilityAlert
      ? "3px solid #f44336"
      : "1px solid transparent",
    transition: "border 0.3s ease",
    animation: showVolatilityAlert
      ? `${pulseRed} 1.5s ease infinite`
      : "none",
  }}
>
```

#### transition: "border 0.3s ease"

borderが変化するときに、**0.3秒かけてなめらかに変化させる**という指定。

- border: どのCSSプロパティに適用するか（borderの変化だけを対象にする
- 0.3s: 変化にかける時間（0.3秒）
- ease: 変化の緩急パターン（最初ゆっくり→速く→ゆっくり）

transitionはあくまで変化をなめらかにするというもので、永遠にアニメーションすることはできない。

#### animation: `${pulseRed} 1.5s ease infinite`

keyframesで定義したアニメーションを再生する指定です。

- ${pulseRed}: どのkeyframesアニメーションを使うか
- 1.5s: 1サイクルにかける時間
- ease: 各サイクルの緩急パターン
- infinite: 終わらずに繰り返し続ける

animationは設定に寄って、永遠にアニメーションすることができる。
