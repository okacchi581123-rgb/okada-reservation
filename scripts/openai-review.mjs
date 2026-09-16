#!/usr/bin/env node
/**
 * OpenAI Responses APIを使ってPull Requestの差分をレビューし、
 * GitHub PRへレビューコメントを投稿する(既存コメントがあれば更新)。
 *
 * 必須環境変数:
 *   OPENAI_API_KEY   - OpenAI APIキー(Secret)
 *   GITHUB_TOKEN      - PRへコメント投稿するためのトークン(Secret / 自動発行のGITHUB_TOKEN)
 *   GITHUB_REPOSITORY - "owner/repo" 形式
 *   PR_NUMBER         - レビュー対象PRの番号
 * 任意環境変数:
 *   OPENAI_MODEL - 使用するモデル(既定値: gpt-5)
 *   DIFF_PATH    - 差分ファイルのパス(既定値: pr.diff)
 *
 * 注意: このスクリプトはAPIキー・トークンの値をログに出力しない。
 */

import { readFileSync } from "node:fs";

const {
  OPENAI_API_KEY,
  OPENAI_MODEL = "gpt-5",
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
  PR_NUMBER,
  DIFF_PATH = "pr.diff",
} = process.env;

const MARKER = "<!-- openai-review-bot:do-not-remove -->";
const MAX_DIFF_CHARS = 60000;

function requireEnv(name, value) {
  if (!value) {
    console.error(`環境変数 ${name} が設定されていません。`);
    process.exit(1);
  }
  return value;
}

requireEnv("OPENAI_API_KEY", OPENAI_API_KEY);
requireEnv("GITHUB_TOKEN", GITHUB_TOKEN);
requireEnv("GITHUB_REPOSITORY", GITHUB_REPOSITORY);
requireEnv("PR_NUMBER", PR_NUMBER);

const [owner, repo] = GITHUB_REPOSITORY.split("/");

const SYSTEM_PROMPT = `あなたはLINE LIFF + Google Apps Script (GAS) + GitHub Pagesで構成される本番予約システムのコードレビュアーです。
渡されるのはPull Requestの差分(unified diff)です。以下の5点を重点的に確認し、日本語で簡潔にレビューしてください。

1. 本番破壊リスク
2. バグ
3. セキュリティ
4. LIFF / GAS / GitHub Pages 接続先の変更(LIFF ID、GAS Deployment ID、GitHub Pages URLなど)
5. 回帰リスク

ルール:
- 上記5点いずれにも問題が見つからない場合は、他の文章を一切付けず、必ず正確に1行だけ「OpenAI Review: 問題なし」と出力してください。
- 問題を見つけた場合は、該当する観点の見出しごとに、具体的なファイル名・該当箇所・理由・推奨対応を箇条書きで記載してください。
- あなたはレビューのみを行います。コードの変更・修正・実行・マージ・デプロイは行いません。
- 差分が途中で切り詰められている場合はその旨を考慮し、断定的な結論を避けてください。`;

function loadDiff() {
  let diff;
  try {
    diff = readFileSync(DIFF_PATH, "utf8");
  } catch (err) {
    console.error(`差分ファイルの読み込みに失敗しました: ${DIFF_PATH}`);
    process.exit(1);
  }

  let truncated = false;
  if (diff.length > MAX_DIFF_CHARS) {
    diff = diff.slice(0, MAX_DIFF_CHARS);
    truncated = true;
  }
  return { diff, truncated };
}

async function callOpenAI(diff, truncated) {
  const userContent = [
    truncated
      ? "(注意: 差分が長いため一部のみを渡しています。以下はその一部です。)\n\n"
      : "",
    "```diff\n",
    diff,
    "\n```",
  ].join("");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `OpenAI API エラー: HTTP ${response.status} ${response.statusText} ${text.slice(
        0,
        500
      )}`
    );
  }

  const data = await response.json();

  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const chunks = [];
  for (const item of data.output || []) {
    for (const c of item.content || []) {
      if (typeof c.text === "string") {
        chunks.push(c.text);
      }
    }
  }
  const text = chunks.join("\n").trim();
  if (!text) {
    throw new Error(
      "OpenAI APIレスポンスからテキストを取得できませんでした。"
    );
  }
  return text;
}

async function githubRequest(pathname, options = {}) {
  const response = await fetch(`https://api.github.com${pathname}`, {
    ...options,
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `GitHub API エラー: HTTP ${response.status} ${response.statusText} ${text.slice(
        0,
        500
      )}`
    );
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function findExistingComment() {
  let page = 1;
  for (;;) {
    const comments = await githubRequest(
      `/repos/${owner}/${repo}/issues/${PR_NUMBER}/comments?per_page=100&page=${page}`
    );
    const found = comments.find(
      (c) => typeof c.body === "string" && c.body.includes(MARKER)
    );
    if (found) return found;
    if (comments.length < 100) return null;
    page += 1;
  }
}

async function upsertComment(body) {
  const existing = await findExistingComment();

  if (existing) {
    await githubRequest(
      `/repos/${owner}/${repo}/issues/comments/${existing.id}`,
      { method: "PATCH", body: JSON.stringify({ body }) }
    );
    console.log(`既存レビューコメント(id: ${existing.id})を更新しました。`);
    return;
  }

  const created = await githubRequest(
    `/repos/${owner}/${repo}/issues/${PR_NUMBER}/comments`,
    { method: "POST", body: JSON.stringify({ body }) }
  );
  console.log(`新規レビューコメント(id: ${created.id})を投稿しました。`);
}

async function main() {
  const { diff, truncated } = loadDiff();
  console.log(`差分読み込み完了(${diff.length}文字, truncated=${truncated})`);

  console.log("OpenAI APIを呼び出しています...");
  const reviewText = await callOpenAI(diff, truncated);
  console.log("OpenAI APIの呼び出しに成功しました。");

  const body = [
    "## OpenAI PR Review",
    "",
    reviewText,
    "",
    "---",
    `_model: ${OPENAI_MODEL}${truncated ? " / diff truncated" : ""}_`,
    MARKER,
  ].join("\n");

  await upsertComment(body);
  console.log("PRへのレビューコメント投稿が完了しました。");
}

main().catch((err) => {
  console.error(`OpenAIレビュー処理でエラーが発生しました: ${err.message}`);
  process.exit(1);
});
