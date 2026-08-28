/* CeilingCore - deterministic JSON and serialized in-page receipt chains. */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CeilingCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var GENESIS = "0".repeat(64);
  var RECEIPT_KEYS = [
    "hash",
    "input_digest",
    "prev_hash",
    "reason",
    "result_digest",
    "result_ok",
    "seq",
    "tool",
    "ts",
    "version"
  ];

  function isPlainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== "[object Object]") return false;
    var proto = Object.getPrototypeOf(value);
    if (proto === null) return true;
    if (!Object.prototype.hasOwnProperty.call(proto, "constructor")) return false;
    return typeof proto.constructor === "function" && proto.constructor.name === "Object";
  }

  function canonicalJson(value) {
    var seen = new WeakSet();

    function encode(item) {
      if (item === null) return "null";
      if (typeof item === "string" || typeof item === "boolean") return JSON.stringify(item);
      if (typeof item === "number") {
        if (!Number.isFinite(item)) throw new TypeError("NON_FINITE_NUMBER");
        return JSON.stringify(Object.is(item, -0) ? 0 : item);
      }
      if (typeof item !== "object") throw new TypeError("UNSUPPORTED_JSON_VALUE");
      if (seen.has(item)) throw new TypeError("CYCLIC_JSON_VALUE");
      seen.add(item);

      var out;
      if (Array.isArray(item)) {
        var encoded = [];
        for (var index = 0; index < item.length; index += 1) {
          if (!Object.prototype.hasOwnProperty.call(item, index)) {
            throw new TypeError("SPARSE_ARRAY");
          }
          encoded.push(encode(item[index]));
        }
        out = "[" + encoded.join(",") + "]";
      } else {
        if (!isPlainObject(item)) throw new TypeError("NON_PLAIN_JSON_OBJECT");
        var keys = Object.keys(item).sort();
        out = "{" + keys.map(function (key) {
          if (typeof item[key] === "undefined") throw new TypeError("UNDEFINED_JSON_VALUE");
          return JSON.stringify(key) + ":" + encode(item[key]);
        }).join(",") + "}";
      }

      seen.delete(item);
      return out;
    }

    return encode(value);
  }

  function cloneJson(value) {
    return JSON.parse(canonicalJson(value));
  }

  async function digestJson(value, cryptoImpl) {
    if (!cryptoImpl || !cryptoImpl.subtle || typeof cryptoImpl.subtle.digest !== "function") {
      throw new Error("CRYPTO_UNAVAILABLE");
    }
    var bytes = new TextEncoder().encode(canonicalJson(value));
    var digest = await cryptoImpl.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  function createReceiptChain(options) {
    options = options || {};
    var cryptoImpl = options.crypto;
    var clock = options.clock || function () { return new Date().toISOString(); };
    var rows = [];
    var tail = Promise.resolve();

    function serialize(task) {
      var run = tail.then(task, task);
      tail = run.then(function () {}, function () {});
      return run;
    }

    async function buildRow(tool, input, result) {
      if (typeof tool !== "string" || !tool) throw new TypeError("INVALID_TOOL_NAME");
      var exactInput = typeof input === "undefined" ? {} : input;
      var exactResult = typeof result === "undefined" ? {} : result;
      var payload = {
        version: "ceiling.receipt.v1",
        seq: rows.length + 1,
        ts: String(clock()),
        tool: tool,
        input_digest: await digestJson(exactInput, cryptoImpl),
        result_digest: await digestJson(exactResult, cryptoImpl),
        result_ok: !!(result && result.ok === true),
        reason: result && result.reason ? String(result.reason) : null,
        prev_hash: rows.length ? rows[rows.length - 1].hash : GENESIS
      };
      return Object.freeze(Object.assign({}, payload, {
        hash: await digestJson(payload, cryptoImpl)
      }));
    }

    function appendAtomic(tool, input, result, commitEffect, commitGuard) {
      return serialize(async function () {
        if (typeof commitEffect === "function"
          && commitEffect.constructor && commitEffect.constructor.name === "AsyncFunction") {
          throw new TypeError("ASYNC_EFFECT_NOT_ALLOWED");
        }
        var row = await buildRow(tool, input, result);
        if (typeof commitGuard === "function" && commitGuard() !== true) {
          var aborted = new Error("ACTION_ABORTED");
          aborted.code = "ACTION_ABORTED";
          throw aborted;
        }
        if (typeof commitEffect === "function") {
          var effectResult = commitEffect();
          if (effectResult && typeof effectResult.then === "function") {
            throw new TypeError("ASYNC_EFFECT_NOT_ALLOWED");
          }
        }
        rows.push(row);
        return cloneJson(row);
      });
    }

    function append(tool, input, result) {
      return appendAtomic(tool, input, result);
    }

    async function snapshot() {
      await tail;
      return cloneJson(rows);
    }

    async function verify(candidateRows) {
      await tail;
      var hasIndependentCandidate = typeof candidateRows !== "undefined";
      var candidate = hasIndependentCandidate ? candidateRows : rows;
      var errors = [];
      if (!Array.isArray(candidate)) {
        return { ok: false, count: 0, tip: GENESIS, errors: ["ROWS_NOT_ARRAY"] };
      }

      var previous = GENESIS;
      for (var index = 0; index < candidate.length; index += 1) {
        var row = candidate[index];
        if (!isPlainObject(row)) {
          errors.push("ROW_" + (index + 1) + "_NOT_OBJECT");
          continue;
        }
        var keys = Object.keys(row).sort();
        if (canonicalJson(keys) !== canonicalJson(RECEIPT_KEYS)) {
          errors.push("ROW_" + (index + 1) + "_KEYS");
        }
        if (row.seq !== index + 1) errors.push("ROW_" + (index + 1) + "_SEQ");
        if (row.prev_hash !== previous) errors.push("ROW_" + (index + 1) + "_PREV");

        var payload = {};
        Object.keys(row).forEach(function (key) {
          if (key !== "hash") payload[key] = row[key];
        });
        var expected;
        try {
          expected = await digestJson(payload, cryptoImpl);
        } catch (error) {
          errors.push("ROW_" + (index + 1) + "_UNHASHABLE");
        }
        if (expected && row.hash !== expected) errors.push("ROW_" + (index + 1) + "_HASH");
        previous = typeof row.hash === "string" ? row.hash : previous;
      }

      if (hasIndependentCandidate) {
        var expectedTip = rows.length ? rows[rows.length - 1].hash : GENESIS;
        if (candidate.length !== rows.length) errors.push("CHECKPOINT_COUNT");
        if (previous !== expectedTip) errors.push("CHECKPOINT_TIP");
      }

      return {
        ok: errors.length === 0,
        count: candidate.length,
        tip: candidate.length && isPlainObject(candidate[candidate.length - 1])
          && typeof candidate[candidate.length - 1].hash === "string"
          ? candidate[candidate.length - 1].hash
          : GENESIS,
        errors: errors
      };
    }

    return {
      append: append,
      appendAtomic: appendAtomic,
      snapshot: snapshot,
      verify: verify,
      genesis: GENESIS
    };
  }

  function createActionRecorder(options) {
    options = options || {};
    var chain = options.chain;
    var max = options.max;
    var reserve = options.reserve || 0;
    var onAppend = options.onAppend;
    var tail = Promise.resolve();
    if (!chain || typeof chain.append !== "function" || typeof chain.appendAtomic !== "function"
      || typeof chain.snapshot !== "function") {
      throw new TypeError("INVALID_RECEIPT_CHAIN");
    }
    if (!Number.isInteger(max) || max < 1) throw new TypeError("INVALID_RECEIPT_LIMIT");
    if (!Number.isInteger(reserve) || reserve < 0 || reserve >= max) {
      throw new TypeError("INVALID_RECEIPT_RESERVE");
    }
    var publicLimit = max - reserve;

    function isAborted(signal) {
      return !!(signal && signal.aborted);
    }

    function notifyAppend() {
      if (typeof onAppend === "function") {
        try { onAppend(); } catch (error) {}
      }
    }

    async function appendRefusal(tool, input, reason) {
      var result = { ok: false, reason: reason };
      await chain.append(tool, typeof input === "undefined" ? {} : input, result);
      notifyAppend();
      return result;
    }

    function refusalWithoutReservedReceipt(reason) {
      return { ok: false, reason: reason, receipt_recorded: false };
    }

    function record(tool, input, prepare, recordOptions) {
      recordOptions = recordOptions || {};
      var run = tail.then(async function () {
        var before = await chain.snapshot();
        if (before.length >= max) {
          return Object.assign(refusalWithoutReservedReceipt("RECEIPT_LIMIT_REACHED"), { limit: max });
        }
        if (before.length >= publicLimit && !recordOptions.priority && !recordOptions.allowReserveOnSuccess) {
          return Object.assign(refusalWithoutReservedReceipt("RECEIPT_LIMIT_REACHED"), { limit: publicLimit });
        }
        if (isAborted(recordOptions.signal)) {
          return before.length < publicLimit || recordOptions.priority
            ? appendRefusal(tool, input, "ABORTED")
            : refusalWithoutReservedReceipt("ABORTED");
        }

        var transaction;
        try {
          transaction = await prepare();
        } catch (error) {
          transaction = {
            result: {
              ok: false,
              reason: "INTERNAL_ERROR",
              message: String(error && error.message ? error.message : error)
            },
            commit: function () {}
          };
        }
        if (!transaction || !isPlainObject(transaction.result) || typeof transaction.commit !== "function") {
          throw new TypeError("INVALID_ACTION_TRANSACTION");
        }
        if (isAborted(recordOptions.signal)) {
          return before.length < publicLimit || recordOptions.priority
            ? appendRefusal(tool, input, "ABORTED")
            : refusalWithoutReservedReceipt("ABORTED");
        }
        if (before.length >= publicLimit && !recordOptions.priority
          && !(recordOptions.allowReserveOnSuccess && transaction.result.ok === true)) {
          return Object.assign(refusalWithoutReservedReceipt("RECEIPT_LIMIT_REACHED"), { limit: publicLimit });
        }

        try {
          await chain.appendAtomic(
            tool,
            typeof input === "undefined" ? {} : input,
            transaction.result,
            transaction.commit,
            function () { return !isAborted(recordOptions.signal); }
          );
        } catch (error) {
          if (error && error.code === "ACTION_ABORTED") {
            return before.length < publicLimit || recordOptions.priority
              ? appendRefusal(tool, input, "ABORTED")
              : refusalWithoutReservedReceipt("ABORTED");
          }
          if (error && error.code === "STALE_AUTHORITY_STATE") {
            return appendRefusal(tool, input, "STATE_CHANGED");
          }
          throw error;
        }
        notifyAppend();
        return transaction.result;
      });
      tail = run.then(function () {}, function () {});
      return run;
    }

    return { record: record, limit: max, public_limit: publicLimit, reserve: reserve };
  }

  return {
    canonicalJson: canonicalJson,
    cloneJson: cloneJson,
    digestJson: digestJson,
    createReceiptChain: createReceiptChain,
    createActionRecorder: createActionRecorder,
    genesis: GENESIS
  };
});
