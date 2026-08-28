/* CeilingAuthority - one-use, content-bound confirmation for in-page actions. */
(function (root, factory) {
  "use strict";
  var core = root && root.CeilingCore;
  if (typeof module === "object" && module.exports) core = require("./core.js");
  var api = factory(core);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CeilingAuthority = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Core) {
  "use strict";

  var TITLE_MAX = 120;
  var BODY_MAX = 2000;
  var GOAL_MAX = 240;
  var ID_MAX = 80;
  var ITEM_MAX = 25;
  var OPERATIONS = ["apply_pending", "reject_pending"];

  function ok(data) { return { ok: true, data: data }; }

  function fail(reason, extra) {
    var result = { ok: false, reason: reason };
    if (extra) Object.keys(extra).forEach(function (key) { result[key] = extra[key]; });
    return result;
  }

  function exactObject(input, keys) {
    if (!input || Object.prototype.toString.call(input) !== "[object Object]") return false;
    var actual = Object.keys(input).sort();
    return Core.canonicalJson(actual) === Core.canonicalJson(keys.slice().sort());
  }

  function codePointLength(value) {
    return Array.from(value).length;
  }

  function createAuthority(options) {
    options = options || {};
    var cryptoImpl = options.crypto;
    var armMs = options.armMs || 15000;
    var wallClockMs = options.clockMs || function () { return Date.now(); };
    var monotonicMs = options.monotonicMs || function () {
      if (typeof performance !== "undefined" && typeof performance.now === "function") {
        return performance.now();
      }
      return Date.now();
    };
    var clockIso = options.clockIso || function () { return new Date(wallClockMs()).toISOString(); };
    var uuid = options.uuid || function () {
      if (!cryptoImpl || typeof cryptoImpl.randomUUID !== "function") throw new Error("UUID_UNAVAILABLE");
      return cryptoImpl.randomUUID();
    };
    var state = {
      goal: "",
      pending: [],
      applied: [],
      rejected: [],
      armed: null
    };
    var revision = 0;
    var tail = Promise.resolve();

    function serialize(task) {
      var run = tail.then(task, task);
      tail = run.then(function () {}, function () {});
      return run;
    }

    function nowTick() {
      var value = monotonicMs();
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new TypeError("INVALID_MONOTONIC_CLOCK");
      }
      return value;
    }

    function effectiveState() {
      var next = Core.cloneJson(state);
      if (next.armed && nowTick() >= next.armed.until_tick) next.armed = null;
      return next;
    }

    function findPending(targetState, id) {
      return targetState.pending.find(function (item) { return item.id === id; }) || null;
    }

    async function binding(item, operation) {
      return Core.digestJson({
        id: item.id,
        title: item.title,
        body: item.body,
        created_at: item.created_at,
        operation: operation
      }, cryptoImpl);
    }

    function prepared(result, nextState, baseRevision) {
      return {
        result: result,
        commit: function () {
          if (!nextState) return;
          if (revision !== baseRevision) {
            var stale = new Error("STALE_AUTHORITY_STATE");
            stale.code = "STALE_AUTHORITY_STATE";
            throw stale;
          }
          state = nextState;
          revision += 1;
        }
      };
    }

    function runPrepared(factory) {
      return serialize(async function () {
        var transaction = await factory();
        transaction.commit();
        return transaction.result;
      });
    }

    async function prepareSetGoal(value) {
      var base = revision;
      var next = effectiveState();
      if (typeof value !== "string" || codePointLength(value) > GOAL_MAX) {
        return prepared(fail("INVALID_GOAL"), null, base);
      }
      next.goal = value;
      return prepared(ok({ goal: next.goal }), next, base);
    }

    async function preparePropose(input) {
      var base = revision;
      var next = effectiveState();
      if (!exactObject(input, ["title", "body"])) return prepared(fail("INVALID_INPUT"), null, base);
      if (typeof input.title !== "string" || typeof input.body !== "string") {
        return prepared(fail("INVALID_INPUT"), null, base);
      }
      if (!input.title.trim() || !input.body.trim()) return prepared(fail("INVALID_INPUT"), null, base);
      if (codePointLength(input.title) > TITLE_MAX || codePointLength(input.body) > BODY_MAX) {
        return prepared(fail("INPUT_TOO_LONG"), null, base);
      }
      if (next.pending.length + next.applied.length + next.rejected.length >= ITEM_MAX) {
        return prepared(fail("SESSION_ITEM_LIMIT", { limit: ITEM_MAX }), null, base);
      }
      var item = {
        id: "p-" + uuid(),
        title: input.title,
        body: input.body,
        created_at: clockIso(),
        status: "pending"
      };
      next.pending.push(item);
      return prepared(ok({ pending_id: item.id, status: item.status, applied: false }), next, base);
    }

    async function prepareArm(id, operation) {
      var base = revision;
      var next = effectiveState();
      if (typeof id !== "string" || !id || codePointLength(id) > ID_MAX || OPERATIONS.indexOf(operation) === -1) {
        return prepared(fail("INVALID_ARM_REQUEST"), null, base);
      }
      var item = findPending(next, id);
      if (!item) return prepared(fail("NOT_FOUND", { id: id }), null, base);
      var untilTick = nowTick() + armMs;
      var expiresAt = new Date(wallClockMs() + armMs).toISOString();
      next.armed = {
        id: id,
        operation: operation,
        binding_digest: await binding(item, operation),
        until_tick: untilTick,
        expires_at: expiresAt
      };
      return prepared(ok({
        id: id,
        operation: operation,
        binding_digest: next.armed.binding_digest,
        expires_at: next.armed.expires_at
      }), next, base);
    }

    async function authorize(targetState, item, operation) {
      if (!targetState.armed) return fail("USER_ACTIVATION_REQUIRED", { id: item.id });
      if (targetState.armed.id !== item.id) return fail("ARM_ID_MISMATCH", { id: item.id });
      if (targetState.armed.operation !== operation) return fail("ARM_OPERATION_MISMATCH", { id: item.id });
      var current = await binding(item, operation);
      if (nowTick() >= targetState.armed.until_tick) {
        targetState.armed = null;
        return fail("USER_ACTIVATION_REQUIRED", { id: item.id });
      }
      if (targetState.armed.binding_digest !== current) {
        targetState.armed = null;
        return fail("ARM_CONTENT_MISMATCH", { id: item.id });
      }
      targetState.armed = null;
      return ok({ authorized: true });
    }

    async function prepareApply(input) {
      var base = revision;
      var next = effectiveState();
      if (!exactObject(input, ["id"]) || typeof input.id !== "string" || !input.id || codePointLength(input.id) > ID_MAX) {
        return prepared(fail("INVALID_INPUT"), null, base);
      }
      var item = findPending(next, input.id);
      if (!item) return prepared(fail("NOT_FOUND", { id: input.id }), null, base);
      var admission = await authorize(next, item, "apply_pending");
      if (!admission.ok) return prepared(admission, null, base);
      item.status = "applied";
      next.pending = next.pending.filter(function (candidate) { return candidate.id !== item.id; });
      next.applied.push({
        id: item.id,
        title: item.title,
        body: item.body,
        created_at: item.created_at,
        applied_at: clockIso()
      });
      return prepared(ok({ id: item.id, applied: true, count: next.applied.length }), next, base);
    }

    async function prepareReject(input) {
      var base = revision;
      var next = effectiveState();
      if (!exactObject(input, ["id"]) || typeof input.id !== "string" || !input.id || codePointLength(input.id) > ID_MAX) {
        return prepared(fail("INVALID_INPUT"), null, base);
      }
      var item = findPending(next, input.id);
      if (!item) return prepared(fail("NOT_FOUND", { id: input.id }), null, base);
      var admission = await authorize(next, item, "reject_pending");
      if (!admission.ok) return prepared(admission, null, base);
      item.status = "rejected";
      next.pending = next.pending.filter(function (candidate) { return candidate.id !== item.id; });
      next.rejected.push({ id: item.id, rejected_at: clockIso() });
      return prepared(ok({ id: item.id, rejected: true }), next, base);
    }

    async function snapshot() {
      await tail;
      var view = effectiveState();
      return Core.cloneJson({
        goal: view.goal,
        pending: view.pending,
        applied: view.applied,
        rejected: view.rejected,
        armed: view.armed ? {
          id: view.armed.id,
          operation: view.armed.operation,
          binding_digest: view.armed.binding_digest,
          expires_at: view.armed.expires_at
        } : null
      });
    }

    return {
      setGoal: function (value) { return runPrepared(function () { return prepareSetGoal(value); }); },
      propose: function (input) { return runPrepared(function () { return preparePropose(input); }); },
      arm: function (id, operation) { return runPrepared(function () { return prepareArm(id, operation); }); },
      apply: function (input) { return runPrepared(function () { return prepareApply(input); }); },
      reject: function (input) { return runPrepared(function () { return prepareReject(input); }); },
      prepareSetGoal: prepareSetGoal,
      preparePropose: preparePropose,
      prepareArm: prepareArm,
      prepareApply: prepareApply,
      prepareReject: prepareReject,
      snapshot: snapshot,
      limits: { title: TITLE_MAX, body: BODY_MAX, goal: GOAL_MAX, id: ID_MAX, items: ITEM_MAX, arm_ms: armMs }
    };
  }

  return {
    createAuthority: createAuthority,
    limits: { title: TITLE_MAX, body: BODY_MAX, goal: GOAL_MAX, id: ID_MAX, items: ITEM_MAX }
  };
});
