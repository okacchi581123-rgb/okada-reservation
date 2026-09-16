# CLAUDE.md — オカダ予約システム 開発運用ルール

このリポジトリ (`okacchi581123-rgb/okada-reservation`) を開発する際の運用ルール。

## 基本方針: GitHub = コードMASTER

- `main` ブランチの内容が唯一の正となる。ローカルの変更・キャッシュ・過去のチャット内の記憶より、常に `origin/main` の実体を優先する。
- 作業を始める前に `git fetch` / `git status` で `origin/main` との差分を確認する。
- 本番で動いているコードは **`main` ブランチの `index.html`** である。これ以外の場所(ローカルの未コミット変更、別ブランチ、チャット内のコード片)は本番ではない。

## 本番接続先(変更には特別な承認が必要)

以下は本番稼働中の接続先。理由なく変更・推測での書き換えを行わない。変更が必要な場合は、必ず人間の指示と確認を得てから行う。

- LIFF ID: `2011019665-wbKBw2hK`
- GAS Deployment ID: `AKfycbyLbD-cpGv3uSMBWRdEsyFRZP9NhBC93VG0gInAPMhdrQ6jhKHRkQexqE_RnNsv9DwVMg`
- GitHub Pages URL: `https://okacchi581123-rgb.github.io/okada-reservation/`

これらの値は `scripts/validate.mjs` で自動検査される。

## 禁止事項

- `main` への直接コミット・直接push
- 本番 `index.html` のLIFF ID / GAS接続先 / GitHub Pages URLの推測による変更
- 内容が不明なGoogle Apps Script (GAS) コードを推測して生成・上書きすること
- 秘密情報・認証情報・トークンをリポジトリやコミット、PRに含めること
- Pull Requestの自己マージ(人間のレビュー・承認を経ずにmergeすること)

## 開発フロー

1. `origin/main` から作業ブランチを作成する(例: `feature/xxx`, `fix/xxx`, `chore/xxx`)。
2. 変更を実装する。本番 `index.html` の接続先を変更する場合は、変更理由と影響範囲をPR説明に明記する。
3. `node scripts/validate.mjs` を実行し、本番接続先が壊れていないことを確認する。
4. コミットし、作業ブランチをpushする。
5. Pull Requestを作成する。テンプレート(`.github/pull_request_template.md`)の項目をすべて埋める。
6. CI (`.github/workflows/ci.yml`) がPRとmainへのpushで自動検査を実行する。CIが通ることを確認する。
7. mergeは人間が行う。自動化・エージェントは merge を実行しない。

## テストファイルについて

`test-staging.html` / `reservation-api-test.html` / `test-cors.html` はステージング検証用ファイルであり、本番 `index.html` とは独立している。これらのファイルにステージング/テスト用のGASデプロイ先が含まれていること自体は正常であり、`scripts/validate.mjs` の検査対象は本番 `index.html` に限定する。

## 将来のGAS管理方針

現時点ではGAS本体(Google Apps Script)はGitHubで管理していない。将来的に [clasp](https://github.com/google/clasp) 等を用いてGAS本体をGitHubで管理する計画があるが、実施は別途の指示・承認のもとで行う。詳細は `docs/AUTOMATION.md` を参照。
