# リアルタイム価格変動ダッシュボード開発

## 目的

Vite/React（フロントエンド）＋ Node.js/Express（バックエンド）構成で、「リアルタイム価格変動ダッシュボード」を開発する。<br>
UIはReactのMUIとRechartsを利用する。<br>
React、Node.jsの開発はいずれもTypeScriptを利用する。

---

## 作業の進め方

このプロジェクトは、React, Node.jsなどの学習を兼ねています。<br>
そのため、**あなたはコードを教えるだけで実装はしないでください。**

以下の流れで作業を進めます。

1. まず最初に環境構築を行いますが、環境構築手順を整理して示してください。<br>
   また、環境構築に関しては、こちらで許可を出せば、あなたが環境構築を実行してください。
1. 環境構築が完了したら、コーディングを進めます。<br>
   こちらから何の機能を実装するかを指示しますが、段階的にコードを示してください。<br>
   その際、どのファイルにどのような変更をするのかを示してください。<br>
   また、なぜそのような変更をするのかを示してください。
1. 作業の区切りで、進捗状況をCLAUDE.mdに記載し、次回は続きから作業ができるようにしてください。

---

## 今後やりたいこと

### ■概要

#### 1. 投資判断を助ける「通知・アラート」機能

リアルタイム性の最大のメリットは「即時性」です。画面をずっと見ていなくても良い仕組みは、ユーザーに喜ばれます。

- 価格急騰・急落アラート: 「1分以内に価格が3%以上動いたら画面を赤く光らせる、またはブラウザ通知を送る」機能。
- 技術的な見せどころ: Node.js側で直近1分間の価格履歴（キュー）を保持し、常に最新価格と比較する「移動平均」や「変化率」のロジック。
- MUIの活用: Snackbar コンポーネントを使った通知表示。

#### 2. 仮想「ポートフォリオ・シミュレーター」

自分が持っていると仮定した通貨の「現在の価値」をリアルタイムで合算表示します。

- 機能: 「1 BTC を 60,000ドルで買った」と入力しておくと、現在の価格に合わせて「含み益・損（P/L）」がリアルタイムで増減する。
- 技術的な見せどころ: フロントエンド（React）での複雑な状態管理（State Management）。複数の計算結果を1秒ごとに再計算する効率的な実装。
- MUIの活用: DataGrid を使った、並び替え可能な資産一覧表。

#### 3. 「マーケット・センチメント（市場の熱量）」の可視化

Binance APIからは、価格だけでなく「取引量（Volume）」も取れます。

- 機能: 「買い」と「売り」のどちらの勢いが強いかをバーチャート（プログレスバー）で表示。
- 技術的な見せどころ: trade ストリームから取得できる、成行買い/成行売りのフラグを集計し、リアルタイムにゲージを動かす。
- MUIの活用: LinearProgress をカスタマイズした「強気/弱気ゲージ」。

---

## 進捗状況

### 完了した作業

#### 環境構築

- `backend/`・`frontend/` ディレクトリ作成・パッケージインストール完了
- `.vscode/launch.json` にBackend（tsx）・Frontend（Vite + Chrome）のデバッグ設定を追加
- `.vscode/tasks.json` にVite dev server起動タスクを追加
- `backend/.gitignore` を作成（`node_modules/`, `dist/`, `.env` など）

#### Backend（`backend/src/index.ts`）

- Express + Socket.io サーバーの構築
- Binance パブリック WebSocket API（`btcusdt@trade`）に接続し、BTC価格をリアルタイム取得
- 取得した価格を `io.emit("btcPrice", { price })` で全クライアントにブロードキャスト
- 切断時の自動再接続ロジック（3秒後）
- ブロードキャスト周期: `BLOADCAST_CYCLE = 5000`（msec）で5秒ごとに送信
- ボラティリティ関連のロジックはフロントエンドに移管済み（バックエンドは価格配信のみ）

#### Frontend

- `src/types/price.ts`：`PriceData`・`PriceStreamOptions`・`PricePayload` の型定義
  - `PriceData` に `timestamp`（ボラティリティ計算用）を追加
  - `PriceStreamOptions` に `volatilityWindowSec`・`volatilityThreshold` を追加
  - `PricePayload` はバックエンドが `{ price }` のみ送信するようになったため簡素化
- `src/hooks/usePriceStream.ts`：Socket.ioで価格を受信するカスタムフック
  - ボラティリティ計算をフロントエンドで実施（タイムスタンプ基準のキュー管理）
  - `ChangePercentState` 型に計算時の設定値（`windowSec`・`threshold`）を持たせ、設定変更時に自動的に `null` を返す派生値パターンを採用
  - `windowSecRef`・`thresholdRef`・`maxHistoryRef` で最新設定値を保持し、socket コールバックの再登録を防止
  - socket イベント登録の `useEffect` は `[symbol]` のみに依存（設定値変更では再登録しない）
  - 各 ref は対応する `useEffect` で最新値に同期（`useEffect(() => { ref.current = value }, [value])` パターン）
  - 設定値変更時の `useEffect`：ウィンドウが変わった場合のみ古い履歴を削除、閾値のみの変更では履歴をそのまま保持
  - `removeDataOutsideWindow` 関数：`history[1]` の age で判定し、参照点となる最古エントリが早期削除されないよう制御（`history[0]` で判定すると90%閾値に届く前に削除され表示されなくなるバグを防ぐ）
  - return 時に `history.slice(-maxHistory)` で派生値として履歴をトリム（effect 内での setState による cascading renders を回避）
  - `changePercent`・`showVolatilityAlert`・`setShowVolatilityAlert` を返す
- `src/components/PriceChart.tsx`：Rechartsの折れ線グラフで価格を表示
  - `durationMin`・`onDurationChange` Props を追加
  - グラフヘッダーを flex レイアウトにし、タイトル左・MUI Select（5分/15分/30分）右に配置
  - Tooltip を `content` prop によるカスタムコンポーネントに変更し、時刻・価格の両方を表示
    - `labelFormatter` は Recharts バージョンやダークテーマとの相性問題があるため `content` prop を採用
    - MUI の `Box`・`Typography` で描画しダークテーマに自然になじむスタイルを適用
- `src/components/AlertSettings.tsx`：上限・下限価格の入力フィールドと、到達時のMUI Snackbar通知
  - `TextField` は `variant="outlined"`（ダークテーマに合わせ、明示的な色指定を廃止）
  - `Alert` は `variant="filled"` でダークテーマでも視認性を確保
- `src/components/VolatilitySettings.tsx`：監視ウィンドウ（秒）・アラート閾値（%）の設定UI
  - ローカルの文字列 state で入力中の中間状態を保持し、有効値のときのみ親へ通知
  - `error`・`helperText` Props でバリデーションエラーを視覚的に表示
- `src/App.tsx`：価格表示カード＋各種視覚効果を組み合わせて表示
  - ボラティリティアラート時：カード赤枠 + `::after` 疑似要素による背景パルスアニメーション
  - 価格フラッシュ：上昇→緑・下落→赤のテキストカラーアニメーション（`key` トリックで再起動）
  - トレンドアイコン：`TrendingUp` / `TrendingDown`（`@mui/icons-material`）
  - 変動率（%）を現在価格の横に表示（上昇→緑・下落→赤）
  - ボラティリティアラート時：「急激な価格変動を検知しました！」Snackbar通知（`variant="filled"`）
  - `volatilityWindowSec`・`volatilityThreshold`・`chartDurationMin` の state を管理
  - `BROADCAST_CYCLE_SEC = 5` に基づき `maxHistory = (chartDurationMin * 60) / BROADCAST_CYCLE_SEC` を動的に算出
  - `Container` の `maxWidth` を `"md"`（900px）から `"xl"`（1536px）に変更（DataGrid 全列表示のため）
- `src/main.tsx`：MUI `ThemeProvider`（`mode: 'dark'`）と `CssBaseline` を追加し、全コンポーネントにダークテーマを適用
- `src/hooks/useUsdJpyRate.ts`：Frankfurter API から USD/JPY レートを取得するカスタムフック
  - マウント時に1回だけ `https://api.frankfurter.app/latest?from=USD&to=JPY` を fetch（日次データのため）
  - `rate`・`loading`・`error` を返す
  - CORS回避のため Vite プロキシ経由（`/frankfurter/...`）でリクエストを送信
- `src/components/PortfolioSimulator.tsx`：仮想ポートフォリオ・シミュレーターコンポーネント（複数ポジション対応済み）
  - `Position` 型：`id`・`investedJpy`・`btcPriceUsd`・`usdJpyRate`・`btcAmount`・`direction` を保持
    - `id` は `crypto.randomUUID()` で生成（DataGrid の行識別・削除に使用）
  - `Action` 型（`ADD` / `REMOVE` / `CLEAR`）と `reducer` 関数で状態管理
  - `useReducer` でポジション配列を管理（`useState<Position[]>` の代わりに採用）
  - `localStorage`（キー: `btc_positions`）でポジション配列を永続化
  - `useUsdJpyRate` フックで取得した実レートで JPY 換算
  - レート取得中・エラー時はカードに状態を表示し、仮想購入ボタンを無効化
  - `ToggleButtonGroup` でロング（買い）/ ショート（空売り）を選択（購入フォームは常時表示）
  - 損益計算：ロングは `(現在価格 − 購入価格) × 数量`、ショートは符号を反転
  - `rows` 配列として各ポジションの評価額・含み損益・騰落率を導出し DataGrid へ渡す
  - `@mui/x-data-grid` の `DataGrid` でポジション一覧を表示
    - 列：方向・購入価格・投資額・保有数量・評価額・含み損益・騰落率・決済ボタン
    - `renderCell` を使うカラムは `<Box sx={{ height: "100%" }}>` で包む（垂直センタリングと白い点の防止）
    - 決済列の `field` は `"settlement"`（`"actions"` は DataGrid の予約語のため使用しない）
  - サマリー表示：平均取得単価（保有数量の加重平均）・合計投資額・合計損益
  - 全決済ボタン（`dispatch({ type: "CLEAR" })`）で全ポジションを一括削除
  - MUI v9 では `inputProps` が廃止されており、`slotProps={{ htmlInput: { min: 1 } }}` を使用
- `src/App.tsx`：`<PortfolioSimulator currentPrice={currentPrice} />` を追加
- `vite.config.ts`：Frankfurter API への CORS 回避のため `server.proxy` を追加
  - `/frankfurter` へのリクエストを `https://api.frankfurter.app` に転送（`changeOrigin: true`）

### 開発方針

- **フェーズ1**（現在）：ユーザ設定値はフロントエンドの state で管理。仮想ポートフォリオ等の機能を全て実装する。
- **フェーズ2**（フェーズ1完了後）：ユーザ設定値をバックエンド（DB）で保持するよう移行する。

### 現在のファイル構成

```
livePriceDashboard/
├── backend/
│   ├── src/index.ts
│   ├── package.json（type: "module"）
│   └── tsconfig.json（module: ESNext）
├── frontend/
│   ├── src/
│   │   ├── types/price.ts
│   │   ├── hooks/
│   │   │   ├── usePriceStream.ts
│   │   │   └── useUsdJpyRate.ts
│   │   ├── components/
│   │   │   ├── PriceChart.tsx
│   │   │   ├── AlertSettings.tsx
│   │   │   ├── VolatilitySettings.tsx
│   │   │   └── PortfolioSimulator.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── package.json
└── .vscode/
    ├── launch.json
    └── tasks.json
```

### 次回以降の候補タスク

- 複数銘柄（ETH、SOLなど）への対応
- マーケット・センチメント（強気/弱気ゲージ）の可視化
- Renderへのデプロイ
