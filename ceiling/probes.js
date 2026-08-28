/* CeilingProbes - isolated, deterministic boundary checks for the implemented core. */
(function (root, factory) {
  "use strict";
  var core = root && root.CeilingCore;
  var authority = root && root.CeilingAuthority;
  if (typeof module === "object" && module.exports) {
    core = require("./core.js");
    authority = require("./authority.js");
  }
  var api = factory(core, authority);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CeilingProbes = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Core, Authority) {
  "use strict";

  var CATALOG = [
    { name: "unarmed_apply", title: "Unarmed apply", proves: "An effect is refused without a live page-activation arm." },
    { name: "wrong_operation", title: "Wrong operation", proves: "An apply arm cannot authorize rejection." },
    { name: "one_use_replay", title: "One-use replay", proves: "A consumed arm cannot apply the same proposal twice." },
    { name: "monotonic_expiry", title: "Monotonic expiry", proves: "An arm expires even if wall time rolls backward." },
    { name: "parallel_apply", title: "Parallel apply", proves: "Concurrent attempts produce exactly one effect." },
    { name: "receipt_tamper", title: "Receipt tamper", proves: "Mutation of a retained receipt fails chain verification." },
    { name: "reserve_starvation", title: "Reserve starvation", proves: "Cancelled calls cannot consume emergency receipt slots." }
  ];

  function clone(value) { return Core.cloneJson(value); }

  function fixture(cryptoImpl) {
    var wall = Date.parse("2026-08-25T00:00:00.000Z");
    var tick = 0;
    var ids = 0;
    return {
      authority: Authority.createAuthority({
        crypto: cryptoImpl,
        armMs: 15000,
        clockMs: function () { return wall; },
        monotonicMs: function () { return tick; },
        clockIso: function () { return new Date(wall).toISOString(); },
        uuid: function () { ids += 1; return "probe-" + ids; }
      }),
      advanceTick: function (milliseconds) { tick += milliseconds; },
      rollbackWall: function (milliseconds) { wall -= milliseconds; }
    };
  }

  function result(name, pass, expected, observed) {
    var item = CATALOG.find(function (candidate) { return candidate.name === name; });
    return {
      name: name,
      title: item ? item.title : name,
      ok: pass === true,
      expected: expected,
      observed: observed
    };
  }

  async function unarmedApply(cryptoImpl) {
    var authority = fixture(cryptoImpl).authority;
    var proposed = await authority.propose({ title: "Probe", body: "No ambient authority" });
    var applied = await authority.apply({ id: proposed.data.pending_id });
    return result("unarmed_apply", !applied.ok && applied.reason === "USER_ACTIVATION_REQUIRED",
      "USER_ACTIVATION_REQUIRED", applied.reason || "unexpected success");
  }

  async function wrongOperation(cryptoImpl) {
    var authority = fixture(cryptoImpl).authority;
    var proposed = await authority.propose({ title: "Probe", body: "Operation binding" });
    await authority.arm(proposed.data.pending_id, "apply_pending");
    var rejected = await authority.reject({ id: proposed.data.pending_id });
    return result("wrong_operation", !rejected.ok && rejected.reason === "ARM_OPERATION_MISMATCH",
      "ARM_OPERATION_MISMATCH", rejected.reason || "unexpected success");
  }

  async function oneUseReplay(cryptoImpl) {
    var authority = fixture(cryptoImpl).authority;
    var proposed = await authority.propose({ title: "Probe", body: "One use" });
    await authority.arm(proposed.data.pending_id, "apply_pending");
    var first = await authority.apply({ id: proposed.data.pending_id });
    var replay = await authority.apply({ id: proposed.data.pending_id });
    return result("one_use_replay", first.ok && !replay.ok && replay.reason === "NOT_FOUND",
      "one success, then NOT_FOUND", { first_ok: first.ok, replay_reason: replay.reason || null });
  }

  async function monotonicExpiry(cryptoImpl) {
    var controls = fixture(cryptoImpl);
    var authority = controls.authority;
    var proposed = await authority.propose({ title: "Probe", body: "Monotonic expiry" });
    await authority.arm(proposed.data.pending_id, "apply_pending");
    controls.rollbackWall(60 * 60 * 1000);
    controls.advanceTick(15000);
    var applied = await authority.apply({ id: proposed.data.pending_id });
    return result("monotonic_expiry", !applied.ok && applied.reason === "USER_ACTIVATION_REQUIRED",
      "USER_ACTIVATION_REQUIRED after 15000 ms", applied.reason || "unexpected success");
  }

  async function parallelApply(cryptoImpl) {
    var authority = fixture(cryptoImpl).authority;
    var proposed = await authority.propose({ title: "Probe", body: "Concurrent apply" });
    await authority.arm(proposed.data.pending_id, "apply_pending");
    var attempts = await Promise.all([
      authority.apply({ id: proposed.data.pending_id }),
      authority.apply({ id: proposed.data.pending_id })
    ]);
    var successCount = attempts.filter(function (attempt) { return attempt.ok; }).length;
    var notFoundCount = attempts.filter(function (attempt) { return attempt.reason === "NOT_FOUND"; }).length;
    return result("parallel_apply", successCount === 1 && notFoundCount === 1,
      "one success and one NOT_FOUND", { success_count: successCount, not_found_count: notFoundCount });
  }

  async function receiptTamper(cryptoImpl) {
    var chain = Core.createReceiptChain({
      crypto: cryptoImpl,
      clock: function () { return "2026-08-25T00:00:00.000Z"; }
    });
    await chain.append("probe", { exact: true }, { ok: true, value: "original" });
    var candidate = await chain.snapshot();
    candidate[0].reason = "tampered";
    var verification = await chain.verify(candidate);
    return result("receipt_tamper", !verification.ok && verification.errors.indexOf("ROW_1_HASH") !== -1,
      "ROW_1_HASH", verification.errors);
  }

  async function reserveStarvation(cryptoImpl) {
    var chain = Core.createReceiptChain({ crypto: cryptoImpl });
    var recorder = Core.createActionRecorder({ chain: chain, max: 5, reserve: 2 });
    function transaction() {
      return Promise.resolve({ result: { ok: true }, commit: function () {} });
    }
    await recorder.record("public", { n: 1 }, transaction);
    await recorder.record("public", { n: 2 }, transaction);
    await recorder.record("public", { n: 3 }, transaction);
    var controller = new AbortController();
    controller.abort();
    var cancelled = await recorder.record("cancelled", {}, transaction, {
      allowReserveOnSuccess: true,
      signal: controller.signal
    });
    var afterCancelled = (await chain.snapshot()).length;
    var priority = await recorder.record("priority", {}, transaction, { priority: true });
    var finalCount = (await chain.snapshot()).length;
    return result(
      "reserve_starvation",
      cancelled.reason === "ABORTED" && cancelled.receipt_recorded === false
        && afterCancelled === 3 && priority.ok && finalCount === 4,
      "cancel leaves 3 receipts; priority reaches 4",
      {
        cancellation: cancelled.reason,
        cancellation_receipt_recorded: cancelled.receipt_recorded,
        after_cancelled: afterCancelled,
        priority_ok: priority.ok,
        final_count: finalCount
      }
    );
  }

  var RUNNERS = {
    unarmed_apply: unarmedApply,
    wrong_operation: wrongOperation,
    one_use_replay: oneUseReplay,
    monotonic_expiry: monotonicExpiry,
    parallel_apply: parallelApply,
    receipt_tamper: receiptTamper,
    reserve_starvation: reserveStarvation
  };

  async function run(name, options) {
    options = options || {};
    if (!Object.prototype.hasOwnProperty.call(RUNNERS, name)) {
      return { ok: false, reason: "UNKNOWN_PROBE", name: name };
    }
    if (!options.crypto) throw new Error("CRYPTO_UNAVAILABLE");
    if (options.signal && options.signal.aborted) {
      return { ok: false, reason: "ABORTED", name: name };
    }
    var result = await RUNNERS[name](options.crypto);
    if (options.signal && options.signal.aborted) {
      return { ok: false, reason: "ABORTED", name: name };
    }
    return result;
  }

  async function runAll(options) {
    var results = [];
    for (var index = 0; index < CATALOG.length; index += 1) {
      results.push(await run(CATALOG[index].name, options));
    }
    return results;
  }

  return {
    list: function () { return clone(CATALOG); },
    names: CATALOG.map(function (item) { return item.name; }),
    run: run,
    runAll: runAll
  };
});
