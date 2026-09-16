# 自動化方針

このドキュメントは、オカダ予約システムの開発自動化基盤の方針を記載する。

## 現状(このPR時点)

- `main` ブランチの `index.html` が本番として GitHub Pages で公開されている。
- 本番は LINE LIFF → (本番 `index.html`) → Google Apps Script (GAS) Web App の順で接続される。
- GAS本体のソースコードは、現時点では GitHub リポジトリで管理していない(Google側のスクリプトエディタが正)。
- 本PRで追加する自動化は「本番の重要接続先(LIFF ID / GAS Deployment ID / GitHub Pages URL)が意図せず変更されていないか」を機械的に検査することが目的であり、本番の挙動やGASコードには一切手を加えない。

## 自動化の全体方針

1. **GitHubをコードMASTERとする**
   - `main` の内容が唯一の正。ローカル変更やチャット履歴上のコードは正ではない。
2. **本番への変更は必ずPR経由**
   - `main` への直接pushは行わない。
   - PRには `.github/pull_request_template.md` の項目(本番影響・テスト結果・ロールバック方法・LIFF/GAS/Pages変更有無)を必ず記載する。
3. **CIによる機械的検査**
   - `.github/workflows/ci.yml` が PR および `main` へのpush時に `scripts/validate.mjs` を実行し、本番接続先の混入・欠落を検出する。
4. **merge は人間が実施**
   - 自動化・エージェントはPR作成までを行い、mergeは行わない。

## 将来的な拡張(未実施・要承認)

- **GAS本体のGitHub管理化**
  - 将来的に [clasp](https://github.com/google/clasp) を用いて GAS プロジェクトを `gas/` ディレクトリ配下でGitHub管理することを検討する。
  - clasp導入時は、GASプロジェクトのソースを `clasp pull` で取得し、レビュー可能な形でリポジトリに取り込む。
  - **今回のPRではGAS本体の取得・変更・推測での再現は一切行わない。** 内容が不明なGASコードを推測で生成することは禁止する([CLAUDE.md](../CLAUDE.md) 参照)。
  - clasp導入後は、GAS側の変更もPR経由・CI検査・人間によるmergeというフローに統一する。
- **テストの拡充**
  - `tests/` ディレクトリに、`scripts/validate.mjs` 自体の単体テストや、将来的なGASロジックのテストを追加していく。
- **Secretsの取り扱い**
  - 認証情報やトークンは今後も一切リポジトリにコミットしない。CIで秘密情報が必要になる場合は GitHub Actions の Secrets 機能を使用する(本PRでは未使用)。

## ディレクトリ構成(将来用)

- `gas/` — 将来、claspでGAS本体を管理する場合の格納先(現時点では空、`README.md` のみ)。
- `tests/` — 将来、自動テストを追加する場合の格納先(現時点では空、`README.md` のみ)。
