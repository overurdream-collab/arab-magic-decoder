import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL("../../.github/workflows/qitaa-buyer-seller-e2e.yml", import.meta.url),
  "utf8",
);

test("browser E2E concurrency is isolated per pull request or branch", () => {
  const group = workflow.match(/^\s*group:\s*(.+)$/m)?.[1];
  assert.ok(group, "concurrency group must be declared");
  assert.match(group, /github\.workflow/);
  assert.match(group, /github\.event\.pull_request\.number/);
  assert.match(group, /github\.ref/);
  assert.match(workflow, /^\s*cancel-in-progress:\s*true\s*$/m);
});

test("browser evidence uploads exclude auth payloads and have short retention", () => {
  const upload = workflow.split(/\n\s*- name: Upload browser evidence\s*\n/)[1];
  assert.ok(upload, "browser evidence upload step must exist");
  const paths = upload.match(
    /^\s*path:[ \t]*\|[ \t]*\n((?:\s{12,}[^\n]+\n)+)/m,
  )?.[1];
  assert.ok(paths, "explicit artifact allowlist required");
  const entries = paths
    .trim()
    .split("\n")
    .map((line) => line.trim());
  assert.deepEqual(entries, [
    "e2e-db-result.txt",
    "/tmp/qitaa-app.log",
    "qitaa-e2e-failure.png",
  ]);
  assert.match(upload, /^\s*retention-days:\s*3\s*$/m);
});
