# 教材画像フォルダ

このフォルダには、教材マスター（`data/textbooks.csv`）で使用する画像ファイルを配置します。

## 使い方

1. 画像ファイル（PNG、JPG 等）をこのフォルダに追加
2. スプレッドシートの教材マスターの `iconUrl` 列に、以下の形式でURLを記入：

   ```
   https://go-englead.github.io/study_app/images/(ファイル名)
   ```

3. CSV エクスポート → `data/textbooks.csv` に配置
4. ブラウザでリロード → 画像が反映される

## 例

| id | name | iconUrl |
|----|------|---------|
| T01 | キクタン【Entry】 | `https://go-englead.github.io/study_app/images/kikutan.png` |

## 推奨仕様

- 形式：PNG または JPG
- サイズ：200×200 px 程度の正方形推奨
- ファイルサイズ：500KB 以下が望ましい（大きすぎるとページ読み込みが遅くなる）

## 注意

- ファイル名は **英数字・ハイフン・アンダースコアのみ** 推奨（日本語ファイル名は避ける）
- 例：`kikutan_entry.png`、`duolingo.png`
