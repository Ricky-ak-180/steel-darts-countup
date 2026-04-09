# Firebase セットアップガイド

## 1. Firebase プロジェクト作成

1. https://console.firebase.google.com/ にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名: `steel-darts-pro`（任意）
4. Google Analytics は OFF で OK（既に gtag.js で計測中）
5. 「プロジェクトを作成」

## 2. Web アプリの登録

1. プロジェクトのトップ → 「</>」（Web）をクリック
2. アプリのニックネーム: `Steel Darts Pro`
3. 「アプリを登録」
4. 表示される `firebaseConfig` の値をコピー

## 3. firebase-config.js を更新

```javascript
var FIREBASE_CONFIG = {
  apiKey: "ここにコピーした値",
  authDomain: "steel-darts-pro.firebaseapp.com",
  databaseURL: "https://steel-darts-pro-default-rtdb.firebaseio.com",
  projectId: "steel-darts-pro",
  storageBucket: "steel-darts-pro.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

var FIREBASE_ENABLED = true;  // ← true に変更！
```

## 4. Authentication（認証）の有効化

1. Firebase Console → 「Authentication」
2. 「始める」をクリック
3. 「匿名」を選択 → 有効化

## 5. Realtime Database の作成

1. Firebase Console → 「Realtime Database」
2. 「データベースを作成」
3. リージョン: `asia-southeast1`（シンガポール）推奨
4. セキュリティルール: 「テストモードで開始」を選択（後で変更）

## 6. セキュリティルールを適用

1. Realtime Database → 「ルール」タブ
2. `store/firebase-rules.json` の内容をコピー＆ペースト
3. 「公開」をクリック

### ルールの説明:
- **読み取り**: 誰でもランキングを見れる
- **書き込み**: 匿名認証済み + 自分のUIDのみ
- **検証**: スコアは 0〜1440（CountUp最大値）、名前は1〜16文字
- **タイムスタンプ**: サーバー時刻のみ（改ざん防止）
- **不正フィールド**: 拒否

## 7. 予算制限（重要！）

1. Firebase Console → 「Spark プラン」（無料）を確認
2. 無料枠: 読み取り 100MB/月、書き込み 10GB/月
3. **Spark プランのままなら課金は絶対に発生しない**

## 8. デプロイ

1. `firebase-config.js` を更新
2. `FIREBASE_ENABLED = true` に変更
3. minify を再実行: `npx terser js/firebase-config.js -o js/firebase-config.min.js --compress --mangle`
4. GitHub Pages にプッシュ

## 動作確認

1. アプリを開く
2. CountUp を1ゲームプレイ
3. 結果画面が出る → 名前入力ダイアログが表示される
4. 名前入力後、「スコアを送信しました！」トースト表示
5. プロフィール画面 → リーダーボードにスコアが表示される
