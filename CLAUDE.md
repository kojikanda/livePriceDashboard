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
- Binance combined stream WebSocket API（`/stream?streams=btcusdt@trade/ethusdt@trade/solusdt@trade`）に接続し、3銘柄の価格をリアルタイム取得
  - combined stream のメッセージ形式: `{ stream: "btcusdt@trade", data: { p: "..." } }`
  - `SYMBOL_MAP`（`{ btcusdt: "BTC", ethusdt: "ETH", solusdt: "SOL" }`）でストリーム名を銘柄名に変換
  - 3銘柄の価格が全て揃った時点で `io.emit("priceUpdate", { BTC, ETH, SOL })` を送信
- ブロードキャスト周期: `BLOADCAST_CYCLE = 5000`（msec）で5秒ごとに送信
- ボラティリティ関連のロジックはフロントエンドに移管済み（バックエンドは価格配信のみ）

#### Frontend

- `src/types/price.ts`：`PriceData`・`PriceStreamOptions`・`PricePayload` の型定義
  - `CryptoSymbol`：`"BTC" | "ETH" | "SOL"` の Union 型（銘柄を型安全に扱うため）
  - `PriceData` に `timestamp`（ボラティリティ計算用）を追加
  - `PriceStreamOptions` の `symbol` を `CryptoSymbol` 型に変更
  - `PricePayload`：`Record<CryptoSymbol, number>`（バックエンドが3銘柄分をまとめて送信）
  - `SentimentResult`：センチメント集計結果（`upCount`・`downCount`・`neutralCount`・`upRatio`・`downRatio`・`windowSize`）
  - `PriceChangeSummary`：騰落率サマリー1件（`label`・`minutesAgo`・`pct`）
- `src/lib/socket.ts`：Socket.io クライアントのシングルトンインスタンス（新規）
  - `export const socket = io("http://localhost:3001")` で1つの接続を全フックで共有
  - 複数フックが同じ URL に接続しても socket が多重生成されないよう分離
- `src/hooks/usePriceStream.ts`：Socket.ioで価格を受信するカスタムフック
  - `"priceUpdate"` イベントを購読し、`data[symbol]` で自銘柄の価格だけを取り出す
  - ハンドラを名前付き関数にして `socket.off("priceUpdate", handler)` で自分のハンドラだけ解除（3銘柄が同じイベントを購読するため必須）
  - ボラティリティ計算をフロントエンドで実施（タイムスタンプ基準のキュー管理）
  - `ChangePercentState` 型に計算時の設定値（`windowSec`・`threshold`）を持たせ、設定変更時に自動的に `null` を返す派生値パターンを採用
  - `windowSecRef`・`thresholdRef`・`maxHistoryRef` で最新設定値を保持し、socket コールバックの再登録を防止
  - socket イベント登録の `useEffect` は `[symbol]` のみに依存（設定値変更では再登録しない）
  - 各 ref は対応する `useEffect` で最新値に同期（`useEffect(() => { ref.current = value }, [value])` パターン）
  - 設定値変更時の `useEffect`：ウィンドウが変わった場合のみ古い履歴を削除、閾値のみの変更では履歴をそのまま保持
  - `removeDataOutsideWindow` 関数：`history[1]` の age で判定し、参照点となる最古エントリが早期削除されないよう制御
  - return 時に `history.slice(-maxHistory)` で派生値として履歴をトリム（effect 内での setState による cascading renders を回避）
  - `changePercent`・`showVolatilityAlert`・`setShowVolatilityAlert` を返す
- `src/hooks/useCurrentPrices.ts`：3銘柄の現在価格のみを返す軽量フック（新規）
  - PortfolioSimulator 専用（履歴・ボラティリティ計算不要）
  - `"priceUpdate"` イベントを購読し `Record<CryptoSymbol, number | null>` を返す
- `src/components/PriceChart.tsx`：Rechartsの折れ線グラフで価格を表示
  - `durationMin`・`onDurationChange` Props を追加
  - グラフヘッダーを flex レイアウトにし、タイトル左・MUI Select（5分/15分/30分）右に配置
  - Tooltip を `content` prop によるカスタムコンポーネントに変更し、時刻・価格の両方を表示
    - `labelFormatter` は Recharts バージョンやダークテーマとの相性問題があるため `content` prop を採用
    - MUI の `Box`・`Typography` で描画しダークテーマに自然になじむスタイルを適用
- `src/components/AlertSettings.tsx`：上限・下限価格の入力フィールドと、到達時のMUI Snackbar通知
  - `TextField` は `variant="outlined"`（ダークテーマに合わせ、明示的な色指定を廃止）
  - `Alert` は `variant="filled"` でダークテーマでも視認性を確保
  - **ターゲット価格アラート自動再設定機能を追加**
    - `OFFSET_RATE = 0.01`（1%）定数でオフセット率を定義
    - `autoReset` state（boolean）＋ `Switch` + `FormControlLabel` で自動更新トグルを追加
    - `setTargetValueByAutoReset(cPrice, isExceedUpperLimit)` を `useCallback` でラップして共通化
      - アラート発火時に `newHigh = cPrice * (1 + OFFSET_RATE)`・`newLow = cPrice * (1 - OFFSET_RATE)` で再設定
      - `useCallback` の依存配列は `[symbol]`（setter は React が安定を保証するため不要）
    - Snackbar メッセージに新しい上限・下限価格を表示
    - `alertedRef`（`{ high: boolean; low: boolean }`）で発火済みフラグを管理し、自動再設定後の即時再発火を防止
  - **入力中アラート一時停止機能を追加**
    - `focusedField` state（`"high" | "low" | null`）でフォーカス中のフィールドを管理
    - `useEffect` 先頭で `if (focusedField !== null) return` としてチェックをスキップ
    - `onFocus`/`onBlur` で `focusedField` を更新
    - `helperText` をフォーカス中のフィールドのみ `"入力中はアラートを一時停止しています"` と表示（非フォーカス時は `" "` でレイアウト高さを維持）
- `src/components/VolatilitySettings.tsx`：監視ウィンドウ（秒）・アラート閾値（%）の設定UI
  - ローカルの文字列 state で入力中の中間状態を保持し、有効値のときのみ親へ通知
  - `error`・`helperText` Props でバリデーションエラーを視覚的に表示
- `src/components/SymbolPanel.tsx`：1銘柄分の表示をまとめたコンポーネント（新規）
  - `symbol: CryptoSymbol` を Props として受け取り、どの銘柄でも同じ構成で表示
  - `usePriceStream` を内部で呼び出し、価格・履歴・ボラティリティを管理
  - `volatilityWindowSec`・`volatilityThreshold`・`chartDurationMin` の state を銘柄ごとに独立管理
  - `maxHistory` を `Math.max(chartHistorySize, SENTIMENT_MIN_HISTORY)` で算出
  - 価格カード（常時表示）：フラッシュアニメーション・トレンドアイコン・変動率を含む
    - `variant="h4"` で表示（3カラム並びに合わせてサイズを調整）
    - ボラティリティアラート時：カード赤枠 + `::after` 疑似要素による背景パルスアニメーション
  - アコーディオン構成（銘柄ごとに独立して開閉可能）:
    - チャート（`defaultExpanded`）・マーケットセンチメント・ボラティリティスコア・アラート設定
    - `AccordionSummary` に `bgcolor: "action.hover"` を指定し `AccordionDetails` と視覚的に区別
  - ボラティリティアラート Snackbar：メッセージ先頭に `{symbol}：` を付けて銘柄を明示
- `src/App.tsx`：3銘柄グリッド＋ポートフォリオアコーディオンのシンプルな構成に刷新
  - `SYMBOLS: CryptoSymbol[] = ["BTC", "ETH", "SOL"]` を `.map()` で回して `SymbolPanel` を3つ並べる
  - CSS Grid（`repeat(3, 1fr)` + `alignItems: "start"` + `"& > *": { minWidth: 0 }`）で3カラムレイアウト
    - `minWidth: 0` が必須：指定しないとコンテンツの最小幅が `1fr` を上回りグリッドが右にはみ出す
  - `PortfolioSimulator` を `Accordion` で包み、ページ下部に配置（props なし）
  - `Container maxWidth="xl"`（1536px）で全体を制約・中央揃え
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
- `src/components/PortfolioSimulator.tsx`：3銘柄対応に刷新（Props なし・自己完結型）
  - `useCurrentPrices` フックで3銘柄の現在価格を取得
  - `Position` 型に `symbol: CryptoSymbol` を追加、`btcPriceUsd` → `entryPriceUsd`、`btcAmount` → `coinAmount` に改名
  - `localStorage` キーを `"portfolio_positions"` に変更（データ構造変更のため）
  - 購入フォームに銘柄選択 `ToggleButtonGroup`（BTC/ETH/SOL）を追加
  - DataGrid に「銘柄」カラムを追加、保有数量は銘柄ごとの小数点桁数で表示（BTC:8・ETH:6・SOL:4）
  - P/L 計算は `currentPrices[p.symbol]` で銘柄ごとの現在価格を使用
  - 合計損益は全ポジションの価格が揃った場合のみ表示
  - 平均取得単価は削除（異なる銘柄が混在するため意味をなさない）
- `frontend/eslint.config.js`：`react-hooks/set-state-in-effect` ルールを無効化
  - `eslint-plugin-react-hooks` v7 で追加された React Compiler 向けルール
  - React Compiler を使用していないため `'react-hooks/set-state-in-effect': 'off'` を設定
- `vite.config.ts`：Frankfurter API への CORS 回避のため `server.proxy` を追加
  - `/frankfurter` へのリクエストを `https://api.frankfurter.app` に転送（`changeOrigin: true`）
- `src/utils/sentimentCalc.ts`：センチメント計算ロジックを UIコンポーネントから独立した関数として実装（バックエンド移行を想定）
  - `calcSentiment(history, windowSize)`：直近N回の上昇/下落/中立の回数と比率を返す
    - `upRatio`・`downRatio` の分母はニュートラルを除いた `upCount + downCount`（方向性のある動きのみで比較）
    - 全てニュートラルの場合は `upRatio = downRatio = 0.5`（バー中央＝ニュートラル）
  - `calcPriceChanges(history, currentPrice, now?)`：5分前・15分前・30分前との騰落率（%）を返す
    - `now` を引数で受け取ることでテスト・バックエンド移行時に時刻を注入可能
    - 履歴が足りず比較できない場合は `pct: null` を返す
- `src/components/MarketSentiment.tsx`：Market Overview セクションのUIコンポーネント（新規）
  - `useMemo` で `calcSentiment` / `calcPriceChanges` の結果をメモ化（価格更新ごとの再計算を最適化）
  - センチメントバー：MUI `LinearProgress` 1本に緑バー（上昇率）＋赤背景（下落側）＋中央白線（ニュートラル基準）
  - 集計ウィンドウ（10/20/30/50回）を `Select` で切り替え可能（コンポーネント内で state 管理）
  - 騰落率サマリー：5分前・15分前・30分前をカード形式で横並び表示、上昇→緑・下落→赤
  - `Typography` 内に `Select` を入れる場合は `component="div"` を指定（`<p>` 内 `<div>` によるハイドレーションエラー回避）
- `src/utils/volatilityCalc.ts`：ボラティリティスコア計算ロジック（新規）
  - `VOLATILITY_WINDOW_SIZE = 30`：集計件数の定義値（変更容易なよう定数として切り出し）
  - `calcVolatilityScore(history, windowSize)`：標準偏差ベースで 0〜100 のスコアを返す
    - 変動係数（CV%）= 標準偏差 ÷ 平均 × 100 を算出し、`MAX_CV_PCT = 0.5`（%）をスコア 100 に対応させて線形変換
    - データ不足（2件未満）の場合は `null` を返す
- `src/components/VolatilityScore.tsx`：ボラティリティスコアのUIコンポーネント（新規）
  - `useMemo([history])` で `calcVolatilityScore` をメモ化し、`history` が変わったとき（＝価格更新時・5秒おき）のみ再計算
  - `@mui/x-charts` の `Gauge` コンポーネントで半円形ゲージを表示
    - `gaugeClasses.valueArc` の `fill` をスコアに応じて動的に変更（青→緑→オレンジ→赤）
  - スコア 80 超でアラート：カード背景を赤みがかった色に変更し、`Chip`（`WarningAmberIcon` + "High Volatility Alert"）を表示
  - `getScoreColor(score)`・`getScoreLabel(score)` を純粋関数として分離（UI ロジックの見通しを良くするため）
  - `Typography variant="caption"` は `<span>` として描画されるため `sx={{ display: "block" }}` で改行を強制
- `src/App.tsx`：`<VolatilityScore history={history} />` を MarketSentiment の直後に追加（旧実装。現在は SymbolPanel 内に移動済み）
- `frontend/src/index.css`：`#root { width: 1126px }` を `width: 100%` に変更
  - 固定幅を外し、Container の `maxWidth="xl"` に幅制御を委ねることで3カラムグリッドが正しく中央揃えに

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
│   │   ├── lib/
│   │   │   └── socket.ts           （socket シングルトン）
│   │   ├── hooks/
│   │   │   ├── usePriceStream.ts
│   │   │   ├── useCurrentPrices.ts （PortfolioSimulator 用軽量フック）
│   │   │   └── useUsdJpyRate.ts
│   │   ├── utils/
│   │   │   ├── sentimentCalc.ts
│   │   │   └── volatilityCalc.ts
│   │   ├── components/
│   │   │   ├── SymbolPanel.tsx      （銘柄ごとの表示をまとめたコンポーネント）
│   │   │   ├── PriceChart.tsx
│   │   │   ├── AlertSettings.tsx
│   │   │   ├── VolatilitySettings.tsx
│   │   │   ├── PortfolioSimulator.tsx
│   │   │   ├── MarketSentiment.tsx
│   │   │   └── VolatilityScore.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── package.json
└── .vscode/
    ├── launch.json
    └── tasks.json
```

### 次回以降の候補タスク

- Renderへのデプロイ
