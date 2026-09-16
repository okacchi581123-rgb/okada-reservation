#!/usr/bin/env node
/**
 * 本番接続先の自動検査スクリプト。
 * Node.js標準機能のみを使用(外部パッケージ不要)。
 *
 * 検査対象は本番エントリポイントである index.html に限定する。
 * test-staging.html 等のステージング検証用ファイルは対象外。
 *
 * 使い方: node scripts/validate.mjs
 * 終了コード: 0 = 問題なし / 1 = 問題あり
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const INDEX_HTML_PATH = path.join(ROOT, "index.html");

// 本番として承認されている接続先(推測ではなく、運用者から明示的に提供された値)
const EXPECTED = {
  liffId: "2011019665-wbKBw2hK",
  gasDeploymentId:
    "AKfycbyLbD-cpGv3uSMBWRdEsyFRZP9NhBC93VG0gInAPMhdrQ6jhKHRkQexqE_RnNsv9DwVMg",
  githubPagesUrl: "https://okacchi581123-rgb.github.io/okada-reservation/",
};

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function validateIndexHtml() {
  if (!existsSync(INDEX_HTML_PATH)) {
    fail(`本番ファイルが見つかりません: ${INDEX_HTML_PATH}`);
    return;
  }

  const html = readFileSync(INDEX_HTML_PATH, "utf8");

  // 1. LIFF ID が存在するか
  if (!html.includes(EXPECTED.liffId)) {
    fail(
      `index.html に本番LIFF ID (${EXPECTED.liffId}) が見つかりません。LIFF IDが変更または削除されている可能性があります。`
    );
  }

  // 2. GAS Deployment ID が存在するか、かつ他のデプロイIDが混入していないか
  const gasUrlPattern =
    /script\.google\.com\/macros\/s\/([A-Za-z0-9_-]+)\/exec/g;
  const foundDeploymentIds = new Set();
  let match;
  while ((match = gasUrlPattern.exec(html)) !== null) {
    foundDeploymentIds.add(match[1]);
  }

  if (foundDeploymentIds.size === 0) {
    fail("index.html にGAS接続先(script.google.com/macros/s/.../exec)が見つかりません。");
  } else {
    if (!foundDeploymentIds.has(EXPECTED.gasDeploymentId)) {
      fail(
        `index.html に本番GAS Deployment ID (${EXPECTED.gasDeploymentId}) が見つかりません。`
      );
    }
    for (const id of foundDeploymentIds) {
      if (id !== EXPECTED.gasDeploymentId) {
        fail(
          `index.html に未承認のGAS Deployment ID が混入しています: ${id}`
        );
      }
    }
  }

  // 3. GitHub Pages URL が存在するか
  if (!html.includes(EXPECTED.githubPagesUrl)) {
    fail(
      `index.html に本番GitHub Pages URL (${EXPECTED.githubPagesUrl}) が見つかりません。`
    );
  }

  // 4. localhost混入チェック
  if (/localhost|127\.0\.0\.1/i.test(html)) {
    fail("index.html に localhost / 127.0.0.1 への接続が混入しています。");
  }

  // 5. staging/test接続先混入チェック
  const stagingIndicators = [
    /staging/i,
    /test-staging/i,
    /移管テスト/,
    /テスト用/,
    /テスト本番候補/,
  ];
  for (const pattern of stagingIndicators) {
    if (pattern.test(html)) {
      fail(
        `index.html にステージング/テスト用と思われる文言が含まれています (パターン: ${pattern})。本番ファイルへのテスト用接続先混入の可能性があります。`
      );
    }
  }
}

function main() {
  console.log("=== 本番接続先 検証開始 ===");
  console.log(`対象: ${INDEX_HTML_PATH}`);

  validateIndexHtml();

  if (warnings.length > 0) {
    console.log("\n--- 警告 ---");
    for (const w of warnings) {
      console.log(`⚠ ${w}`);
    }
  }

  if (errors.length > 0) {
    console.log("\n--- エラー ---");
    for (const e of errors) {
      console.log(`✗ ${e}`);
    }
    console.log(`\n=== 検証失敗: ${errors.length}件のエラー ===`);
    process.exit(1);
  }

  console.log("\n=== 検証成功: 本番接続先に問題は見つかりませんでした ===");
  process.exit(0);
}

main();
