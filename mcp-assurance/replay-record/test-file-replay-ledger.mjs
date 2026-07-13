import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFileReplayLedger, replayMarkerPath } from "./file-replay-ledger.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const probe = path.join(root, "probe-file-replay-ledger.mjs");

function runProbe(directory, operationId) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [probe, directory, operationId], (error, stdout, stderr) => {
      if (error) reject(new Error(stderr || error.message));
      else resolve(JSON.parse(stdout));
    });
  });
}

test("file-backed replay ledger accepts one claim and denies its replay", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mcp-agent-ledger-"));
  const ledger = createFileReplayLedger({ directory });
  assert.deepEqual(ledger.claim("operation-local"), { accepted: true, status: 200, errorCode: null });
  assert.deepEqual(ledger.claim("operation-local"), { accepted: false, status: 400, errorCode: "operation_replayed" });
});

test("file-backed replay ledger admits exactly one of twelve local processes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mcp-agent-ledger-process-"));
  const results = await Promise.all(Array.from({ length: 12 }, () => runProbe(directory, "operation-cross-process")));
  assert.equal(results.filter((result) => result.accepted).length, 1);
  assert.equal(results.filter((result) => result.errorCode === "operation_replayed").length, 11);
});

test("file-backed replay ledger denies a persisted claim from a fresh local process", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mcp-agent-ledger-process-restart-"));
  const operationId = "operation-process-restart";
  assert.deepEqual(await runProbe(directory, operationId), { accepted: true, status: 200, errorCode: null });
  assert.deepEqual(await runProbe(directory, operationId), { accepted: false, status: 400, errorCode: "operation_replayed" });
});

test("file-backed replay ledger persists a digest-only claim across recreation", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mcp-agent-ledger-restart-"));
  const operationId = "operation-restart-persistence";
  const first = createFileReplayLedger({ directory, now: () => 1_000 });
  assert.equal(first.claim(operationId).accepted, true);
  const marker = await readFile(replayMarkerPath(directory, operationId), "utf8");
  assert.equal(marker.includes(operationId), false);
  assert.equal(JSON.parse(marker).claimedAt, 1_000);
  const recovered = createFileReplayLedger({ directory, now: () => 2_000 });
  assert.deepEqual(recovered.claim(operationId), { accepted: false, status: 400, errorCode: "operation_replayed" });
});

test("corrupt or interrupted replay marker fails closed after recreation", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mcp-agent-ledger-corrupt-"));
  const operationId = "operation-corrupt-marker";
  const interrupted = createFileReplayLedger({
    directory,
    onMarkerCreated() { throw new Error("simulated_interrupted_write"); },
  });
  assert.deepEqual(interrupted.claim(operationId), { accepted: false, status: 503, errorCode: "replay_store_unavailable" });
  const recovered = createFileReplayLedger({ directory });
  assert.deepEqual(recovered.claim(operationId), { accepted: false, status: 503, errorCode: "replay_store_corrupt" });

  const malformedOperation = "operation-malformed-marker";
  await writeFile(replayMarkerPath(directory, malformedOperation), "not-json\n", "utf8");
  assert.deepEqual(recovered.claim(malformedOperation), { accepted: false, status: 503, errorCode: "replay_store_corrupt" });
});

test("a fresh local process fails closed on a corrupt replay marker", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "mcp-agent-ledger-process-corrupt-"));
  const operationId = "operation-process-corrupt";
  await writeFile(replayMarkerPath(directory, operationId), "not-json\n", "utf8");
  assert.deepEqual(await runProbe(directory, operationId), { accepted: false, status: 503, errorCode: "replay_store_corrupt" });
});
