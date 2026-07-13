import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, writeSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const RECORD_SCHEMA = "xclusivexo.fixture-replay-record.v1";

export function replayOperationDigest(operationId) {
  return createHash("sha256").update(String(operationId)).digest("hex");
}

export function replayMarkerPath(directory, operationId) {
  return path.join(directory, replayOperationDigest(operationId));
}

function accepted() {
  return { accepted: true, status: 200, errorCode: null };
}

function denied(errorCode, status = 400) {
  return { accepted: false, status, errorCode };
}

function syncDirectory(directory) {
  const handle = openSync(directory, "r");
  try {
    fsyncSync(handle);
  } finally {
    closeSync(handle);
  }
}

function existingMarkerDecision(marker, operationDigest) {
  try {
    const record = JSON.parse(readFileSync(marker, "utf8"));
    if (
      record?.schema !== RECORD_SCHEMA ||
      record.operationDigest !== operationDigest ||
      !Number.isFinite(record.claimedAt)
    ) {
      return denied("replay_store_corrupt", 503);
    }
    return denied("operation_replayed", 400);
  } catch (_error) {
    return denied("replay_store_corrupt", 503);
  }
}

export function createFileReplayLedger({ directory, now = () => Date.now(), onMarkerCreated } = {}) {
  if (!directory) throw new Error("directory_required");
  mkdirSync(directory, { recursive: true, mode: 0o700 });

  return {
    claim(operationId) {
      const operationDigest = replayOperationDigest(operationId);
      const marker = replayMarkerPath(directory, operationId);
      let handle;
      try {
        handle = openSync(marker, "wx", 0o600);
      } catch (error) {
        if (error?.code === "EEXIST") return existingMarkerDecision(marker, operationDigest);
        return denied("replay_store_unavailable", 503);
      }

      try {
        onMarkerCreated?.({ marker, operationDigest });
        const record = { schema: RECORD_SCHEMA, operationDigest, claimedAt: now() };
        writeSync(handle, `${JSON.stringify(record)}\n`, undefined, "utf8");
        fsyncSync(handle);
      } catch (_error) {
        // Keep an incomplete marker rather than risk reauthorizing this operation after recovery.
        return denied("replay_store_unavailable", 503);
      } finally {
        closeSync(handle);
      }

      try {
        syncDirectory(directory);
      } catch (_error) {
        return denied("replay_store_unavailable", 503);
      }
      return accepted();
    },
  };
}
