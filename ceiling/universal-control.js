/* CeilingUniversalControl - adapter-driven, exact-authority state changes. */
(function (root, factory) {
  "use strict";
  var core = root && root.CeilingCore;
  if (typeof module === "object" && module.exports) core = require("./core.js");
  var api = factory(core);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CeilingUniversalControl = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Core) {
  "use strict";

  if (!Core || typeof Core.canonicalJson !== "function"
    || typeof Core.cloneJson !== "function" || typeof Core.digestJson !== "function") {
    throw new Error("CEILING_CORE_MISSING");
  }

  var OPERATIONS = ["apply_change", "reject_change", "rollback_change"];
  var RISKS = ["low", "medium", "high", "critical"];
  var DEFAULT_LIMITS = Object.freeze({
    rationale: 600,
    request_id: 64,
    requests: 50,
    goal: 240,
    id: 80,
    items: 25
  });

  function ok(data) { return { ok: true, data: data }; }

  function fail(reason, extra) {
    var result = { ok: false, reason: reason };
    if (extra) Object.keys(extra).forEach(function (key) { result[key] = extra[key]; });
    return result;
  }

  function codePointLength(value) { return Array.from(value).length; }

  function exactObject(input, keys) {
    if (!input || Object.prototype.toString.call(input) !== "[object Object]") return false;
    try {
      var reflected = Reflect.ownKeys(input);
      if (reflected.some(function (key) { return typeof key !== "string"; })
        || Core.canonicalJson(reflected.slice().sort()) !== Core.canonicalJson(keys.slice().sort())) {
        return false;
      }
      Core.canonicalJson(input);
      return Core.canonicalJson(Object.keys(input).sort()) === Core.canonicalJson(keys.slice().sort());
    } catch (error) {
      return false;
    }
  }

  function sameJson(left, right) {
    return Core.canonicalJson(left) === Core.canonicalJson(right);
  }

  function own(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function setOwn(object, key, value) {
    Object.defineProperty(object, key, {
      configurable: true,
      enumerable: true,
      value: value,
      writable: true
    });
  }

  function integer(value, fallback, minimum, maximum, name) {
    var selected = typeof value === "undefined" ? fallback : value;
    if (!Number.isInteger(selected) || selected < minimum || selected > maximum) {
      throw new TypeError("INVALID_" + name.toUpperCase());
    }
    return selected;
  }

  function validateDefinition(name, definition) {
    if (!definition || Object.prototype.toString.call(definition) !== "[object Object]") {
      throw new TypeError("INVALID_FIELD_DEFINITION:" + name);
    }
    if (["boolean", "integer", "number", "string"].indexOf(definition.type) === -1) {
      throw new TypeError("INVALID_FIELD_TYPE:" + name);
    }
    var allowedKeys = ["description", "label", "type"];
    if (definition.type === "string") {
      allowedKeys = allowedKeys.concat(["enum", "maxLength", "minLength"]);
    } else if (definition.type === "integer" || definition.type === "number") {
      allowedKeys = allowedKeys.concat(["maximum", "minimum"]);
    }
    if (Object.keys(definition).some(function (key) { return allowedKeys.indexOf(key) === -1; })) {
      throw new TypeError("UNKNOWN_FIELD_DEFINITION_KEY:" + name);
    }
    if (typeof definition.label !== "string" || !definition.label
      || codePointLength(definition.label) > 80
      || typeof definition.description !== "string" || !definition.description
      || codePointLength(definition.description) > 150) {
      throw new TypeError("INVALID_FIELD_COPY:" + name);
    }
    if (definition.type === "string" && typeof definition.enum !== "undefined") {
      if (!Array.isArray(definition.enum) || !definition.enum.length
        || definition.enum.length > 256
        || definition.enum.some(function (item) { return typeof item !== "string"; })
        || new Set(definition.enum).size !== definition.enum.length
        || definition.enum.some(function (item) { return codePointLength(item) > 10000; })) {
        throw new TypeError("INVALID_FIELD_ENUM:" + name);
      }
    }
    if (definition.type === "string") {
      ["minLength", "maxLength"].forEach(function (key) {
        if (typeof definition[key] !== "undefined"
          && (!Number.isInteger(definition[key]) || definition[key] < 0 || definition[key] > 10000)) {
          throw new TypeError("INVALID_FIELD_LENGTH:" + name);
        }
      });
      if (Number.isInteger(definition.minLength) && Number.isInteger(definition.maxLength)
        && definition.minLength > definition.maxLength) {
        throw new TypeError("INVALID_FIELD_LENGTH:" + name);
      }
      if (!definition.enum && !Number.isInteger(definition.maxLength)) {
        throw new TypeError("UNBOUNDED_STRING_FIELD:" + name);
      }
      if (definition.enum && definition.enum.some(function (item) {
        var length = codePointLength(item);
        return (Number.isInteger(definition.minLength) && length < definition.minLength)
          || (Number.isInteger(definition.maxLength) && length > definition.maxLength);
      })) {
        throw new TypeError("INVALID_FIELD_ENUM_LENGTH:" + name);
      }
    }
    if (definition.type === "integer") {
      if (!Number.isSafeInteger(definition.minimum) || !Number.isSafeInteger(definition.maximum)
        || definition.minimum > definition.maximum) {
        throw new TypeError("INVALID_FIELD_RANGE:" + name);
      }
    } else if (definition.type === "number") {
      if (typeof definition.minimum !== "number" || typeof definition.maximum !== "number"
        || !Number.isFinite(definition.minimum) || !Number.isFinite(definition.maximum)
        || definition.minimum > definition.maximum) {
        throw new TypeError("INVALID_FIELD_RANGE:" + name);
      }
    }
  }

  function validateValue(definitions, field, value) {
    var definition = definitions[field];
    if (!definition) return fail("UNKNOWN_FIELD", { field: field });
    if (definition.type === "boolean") {
      return typeof value === "boolean" ? ok(value) : fail("INVALID_VALUE_TYPE", { field: field });
    }
    if (definition.type === "string") {
      if (typeof value !== "string") return fail("INVALID_VALUE_TYPE", { field: field });
      if (definition.enum && definition.enum.indexOf(value) === -1) {
        return fail("INVALID_VALUE", { field: field, allowed: definition.enum.slice() });
      }
      if (Number.isInteger(definition.minLength) && codePointLength(value) < definition.minLength) {
        return fail("VALUE_OUT_OF_RANGE", { field: field, minimum: definition.minLength });
      }
      if (Number.isInteger(definition.maxLength) && codePointLength(value) > definition.maxLength) {
        return fail("VALUE_OUT_OF_RANGE", { field: field, maximum: definition.maxLength });
      }
      return ok(value);
    }
    if (definition.type === "integer" && !Number.isSafeInteger(value)) {
      return fail("INVALID_VALUE_TYPE", { field: field });
    }
    if (definition.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) {
      return fail("INVALID_VALUE_TYPE", { field: field });
    }
    if (value < definition.minimum || value > definition.maximum) {
      return fail("VALUE_OUT_OF_RANGE", {
        field: field,
        minimum: definition.minimum,
        maximum: definition.maximum
      });
    }
    return ok(value);
  }

  function normalizeAssessment(candidate) {
    if (!candidate || Object.prototype.toString.call(candidate) !== "[object Object]") {
      return fail("POLICY_EVALUATION_FAILED");
    }
    if (!exactObject(candidate, ["allowed", "code", "risk", "reasons"])
      || typeof candidate.allowed !== "boolean" || typeof candidate.code !== "string"
      || !/^[A-Z][A-Z0-9_]{0,63}$/.test(candidate.code)
      || RISKS.indexOf(candidate.risk) === -1 || !Array.isArray(candidate.reasons)
      || !candidate.reasons.length || candidate.reasons.length > 8
      || Object.keys(candidate.reasons).length !== candidate.reasons.length
      || candidate.reasons.some(function (reason) {
        return typeof reason !== "string" || !reason || codePointLength(reason) > 240;
      })) {
      return fail("POLICY_EVALUATION_FAILED");
    }
    return ok({
      allowed: candidate.allowed,
      code: candidate.code,
      risk: candidate.risk,
      reasons: candidate.reasons.slice()
    });
  }

  function defineAdapter(specification) {
    if (!specification || Object.prototype.toString.call(specification) !== "[object Object]") {
      throw new TypeError("INVALID_ADAPTER");
    }
    var adapterKeys = [
      "assessChange",
      "fieldDefinitions",
      "fieldOrder",
      "idPrefix",
      "initialValues",
      "limits",
      "scenario"
    ];
    if (Reflect.ownKeys(specification).some(function (key) {
      return typeof key !== "string" || adapterKeys.indexOf(key) === -1;
    })) {
      throw new TypeError("UNKNOWN_ADAPTER_KEY");
    }
    var scenario = specification.scenario;
    if (typeof scenario !== "string" || !/^[a-z][a-z0-9_]{0,63}$/.test(scenario)) {
      throw new TypeError("INVALID_SCENARIO");
    }
    if (!Array.isArray(specification.fieldOrder) || !specification.fieldOrder.length
      || specification.fieldOrder.length > 64
      || new Set(specification.fieldOrder).size !== specification.fieldOrder.length
      || specification.fieldOrder.some(function (field) {
        return typeof field !== "string" || !/^[a-z][a-z0-9_]{0,63}$/.test(field);
      })) {
      throw new TypeError("INVALID_FIELD_ORDER");
    }
    var fields = specification.fieldOrder.slice();
    var definitions = Core.cloneJson(specification.fieldDefinitions);
    var initialValues = Core.cloneJson(specification.initialValues);
    if (!exactObject(definitions, fields) || !exactObject(initialValues, fields)) {
      throw new TypeError("ADAPTER_FIELD_MISMATCH");
    }
    fields.forEach(function (field) {
      validateDefinition(field, definitions[field]);
      if (!validateValue(definitions, field, initialValues[field]).ok) {
        throw new TypeError("INVALID_INITIAL_VALUE:" + field);
      }
    });
    if (typeof specification.assessChange !== "function") {
      throw new TypeError("MISSING_POLICY_EVALUATOR");
    }

    var suppliedLimits = specification.limits || {};
    if (!exactObject(suppliedLimits, Object.keys(suppliedLimits))
      || Object.keys(suppliedLimits).some(function (key) {
        return ["goal", "id", "items", "rationale", "request_id", "requests"].indexOf(key) === -1;
      })) {
      throw new TypeError("INVALID_ADAPTER_LIMITS");
    }
    var limits = {
      rationale: integer(suppliedLimits.rationale, DEFAULT_LIMITS.rationale, 1, 10000, "RATIONALE_LIMIT"),
      request_id: integer(suppliedLimits.request_id, DEFAULT_LIMITS.request_id, 1, 512, "REQUEST_ID_LIMIT"),
      requests: integer(suppliedLimits.requests, DEFAULT_LIMITS.requests, 1, 1000, "REQUEST_LIMIT"),
      goal: integer(suppliedLimits.goal, DEFAULT_LIMITS.goal, 1, 10000, "GOAL_LIMIT"),
      id: integer(suppliedLimits.id, DEFAULT_LIMITS.id, 1, 512, "ID_LIMIT"),
      items: integer(suppliedLimits.items, DEFAULT_LIMITS.items, 1, 1000, "ITEM_LIMIT")
    };
    var idPrefix = typeof specification.idPrefix === "string" ? specification.idPrefix : "c-";
    if (!/^[A-Za-z0-9._:-]{0,24}$/.test(idPrefix)) throw new TypeError("INVALID_ID_PREFIX");

    function catalog() {
      return fields.map(function (name) {
        return Object.assign({ name: name }, Core.cloneJson(definitions[name]));
      });
    }

    function valueSchema(definition) {
      var schema = { type: definition.type, description: definition.description };
      if (definition.enum) schema.enum = definition.enum.slice();
      if (typeof definition.minimum === "number") schema.minimum = definition.minimum;
      if (typeof definition.maximum === "number") schema.maximum = definition.maximum;
      if (Number.isInteger(definition.minLength)) schema.minLength = definition.minLength;
      if (Number.isInteger(definition.maxLength)) schema.maxLength = definition.maxLength;
      return schema;
    }

    function inputSchemas() {
      return Core.cloneJson({
        proposal: {
          type: "object",
          additionalProperties: false,
          required: ["request_id", "scenario", "field", "value", "rationale"],
          properties: {
            request_id: {
              type: "string",
              minLength: 1,
              maxLength: limits.request_id,
              pattern: "^[A-Za-z0-9._:-]+$",
              description: "Idempotency key bound to this exact proposal payload."
            },
            scenario: {
              type: "string",
              enum: [scenario],
              description: "Exact adapter scenario identifier."
            },
            field: {
              type: "string",
              enum: fields.slice(),
              description: "Declared scalar policy field to change."
            },
            value: { description: "Replacement value; its type and bounds depend on field." },
            rationale: {
              type: "string",
              minLength: 1,
              maxLength: limits.rationale,
              pattern: "\\S",
              description: "Brief reason for proposing this exact change."
            }
          },
          oneOf: fields.map(function (field) {
            return {
              required: ["field", "value"],
              properties: {
                field: { type: "string", enum: [field] },
                value: valueSchema(definitions[field])
              }
            };
          })
        },
        decision: {
          type: "object",
          additionalProperties: false,
          required: ["id"],
          properties: {
            id: {
              type: "string",
              minLength: 1,
              maxLength: limits.id,
              description: "Exact change identifier for the requested decision or recovery operation."
            }
          }
        }
      });
    }

    function assessChange(field, previousValue, proposedValue, values) {
      var selectedValues = typeof values === "undefined" ? initialValues : values;
      if (fields.indexOf(field) === -1 || !exactObject(selectedValues, fields)) {
        return fail("INVALID_POLICY_STATE");
      }
      for (var index = 0; index < fields.length; index += 1) {
        if (!validateValue(definitions, fields[index], selectedValues[fields[index]]).ok) {
          return fail("INVALID_POLICY_STATE", { field: fields[index] });
        }
      }
      var previous = validateValue(definitions, field, previousValue);
      if (!previous.ok) return previous;
      var proposed = validateValue(definitions, field, proposedValue);
      if (!proposed.ok) return proposed;
      var candidate;
      try {
        candidate = specification.assessChange({
          scenario: scenario,
          field: field,
          previousValue: Core.cloneJson(previousValue),
          proposedValue: Core.cloneJson(proposedValue),
          values: Core.cloneJson(selectedValues)
        });
      } catch (error) {
        return fail("POLICY_EVALUATION_FAILED");
      }
      return normalizeAssessment(candidate);
    }

    fields.forEach(function (field) {
      var initialAssessment = assessChange(
        field,
        initialValues[field],
        initialValues[field],
        initialValues
      );
      if (!initialAssessment.ok || !initialAssessment.data.allowed) {
        throw new TypeError("UNSAFE_INITIAL_POLICY:" + field);
      }
    });

    function createWorkbench(options) {
      options = options || {};
      var cryptoImpl = options.crypto;
      if (!cryptoImpl || !cryptoImpl.subtle || typeof cryptoImpl.subtle.digest !== "function") {
        throw new TypeError("INVALID_CRYPTO");
      }
      ["clockIso", "clockMs", "monotonicMs", "uuid"].forEach(function (key) {
        if (typeof options[key] !== "undefined" && typeof options[key] !== "function") {
          throw new TypeError("INVALID_" + key.toUpperCase());
        }
      });
      if (typeof options.uuid === "undefined" && typeof cryptoImpl.randomUUID !== "function") {
        throw new TypeError("UUID_UNAVAILABLE");
      }
      var armMs = integer(options.armMs, 15000, 1, 300000, "ARM_MS");
      var wallClockMs = options.clockMs || function () { return Date.now(); };
      function wallNow() {
        var value = wallClockMs();
        if (!Number.isSafeInteger(value) || Math.abs(value) > 8640000000000000 - armMs) {
          throw new TypeError("INVALID_WALL_CLOCK");
        }
        return value;
      }
      var monotonicMs = options.monotonicMs || function () {
        if (typeof performance !== "undefined" && typeof performance.now === "function") {
          return performance.now();
        }
        return Date.now();
      };
      var clockIso = options.clockIso || function () { return new Date(wallNow()).toISOString(); };
      function nowIso() {
        var value = clockIso();
        if (typeof value !== "string" || value.length > 32) {
          throw new TypeError("INVALID_ISO_CLOCK");
        }
        try {
          if (new Date(value).toISOString() !== value) throw new TypeError("INVALID_ISO_CLOCK");
        } catch (error) {
          throw new TypeError("INVALID_ISO_CLOCK");
        }
        return value;
      }
      var uuid = options.uuid || function () {
        if (!cryptoImpl || typeof cryptoImpl.randomUUID !== "function") throw new Error("UUID_UNAVAILABLE");
        return cryptoImpl.randomUUID();
      };
      var state = {
        goal: "",
        values: Core.cloneJson(initialValues),
        policy_version: 0,
        pending: [],
        applied: [],
        rejected: [],
        rolled_back: [],
        armed: null,
        last_decision: null,
        requests: {}
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

      function hasKnownId(targetState, id) {
        return targetState.pending.concat(targetState.applied, targetState.rejected)
          .some(function (item) { return item.id === id; });
      }

      async function binding(item, operation) {
        if (operation === "rollback_change") {
          return Core.digestJson({
            id: item.id,
            scenario: item.scenario,
            field: item.field,
            before: item.before,
            after: item.after,
            baseline_version: item.baseline_version,
            applied_version: item.applied_version,
            rationale: item.rationale,
            risk: item.risk,
            created_at: item.created_at,
            applied_at: item.applied_at,
            operation: operation
          }, cryptoImpl);
        }
        return Core.digestJson({
          id: item.id,
          scenario: item.scenario,
          field: item.field,
          previous_value: item.previous_value,
          proposed_value: item.proposed_value,
          baseline_version: item.baseline_version,
          rationale: item.rationale,
          request_id: item.request_id,
          risk: item.risk,
          policy_code: item.policy.code,
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
        if (typeof value !== "string" || codePointLength(value) > limits.goal) {
          return prepared(fail("INVALID_GOAL"), null, base);
        }
        next.goal = value;
        return prepared(ok({ goal: next.goal }), next, base);
      }

      async function preparePropose(input) {
        var base = revision;
        var next = effectiveState();
        if (!exactObject(input, ["request_id", "scenario", "field", "value", "rationale"])) {
          return prepared(fail("INVALID_INPUT"), null, base);
        }
        if (input.scenario !== scenario || typeof input.field !== "string"
          || typeof input.rationale !== "string" || !input.rationale.trim()
          || typeof input.request_id !== "string" || !input.request_id
          || codePointLength(input.request_id) > limits.request_id
          || !/^[A-Za-z0-9._:-]+$/.test(input.request_id)) {
          return prepared(fail("INVALID_INPUT"), null, base);
        }
        if (codePointLength(input.rationale) > limits.rationale) {
          return prepared(fail("INPUT_TOO_LONG"), null, base);
        }
        var validated = validateValue(definitions, input.field, input.value);
        if (!validated.ok) return prepared(validated, null, base);
        var requestDigest = await Core.digestJson(input, cryptoImpl);
        var priorRequest = own(next.requests, input.request_id)
          ? next.requests[input.request_id]
          : null;
        if (priorRequest) {
          if (priorRequest.digest !== requestDigest) {
            return prepared(fail("IDEMPOTENCY_CONFLICT", { request_id: input.request_id }), null, base);
          }
          var replay = Core.cloneJson(priorRequest.result);
          replay.idempotent_replay = true;
          return prepared(replay, null, base);
        }
        if (Object.keys(next.requests).length >= limits.requests) {
          return prepared(fail("SESSION_REQUEST_LIMIT", { limit: limits.requests }), null, base);
        }
        var previousValue = next.values[input.field];
        if (sameJson(previousValue, input.value)) {
          return prepared(fail("NO_EFFECT", { field: input.field }), null, base);
        }
        var assessed = assessChange(input.field, previousValue, input.value, next.values);
        if (!assessed.ok) return prepared(assessed, null, base);
        var assessment = assessed.data;
        if (!assessment.allowed) {
          next.last_decision = {
            ok: false,
            reason: "POLICY_DENIED",
            field: input.field,
            proposed_value: input.value,
            policy: assessment,
            decided_at: nowIso()
          };
          var denied = fail("POLICY_DENIED", {
            field: input.field,
            risk: assessment.risk,
            policy_code: assessment.code,
            reasons: assessment.reasons
          });
          setOwn(next.requests, input.request_id, {
            digest: requestDigest,
            result: Core.cloneJson(denied)
          });
          return prepared(denied, next, base);
        }
        if (next.pending.length + next.applied.length + next.rejected.length >= limits.items) {
          return prepared(fail("SESSION_ITEM_LIMIT", { limit: limits.items }), null, base);
        }
        var generatedId = idPrefix + String(uuid());
        if (!generatedId || codePointLength(generatedId) > limits.id
          || !/^[A-Za-z0-9._:-]+$/.test(generatedId)) {
          return prepared(fail("INVALID_GENERATED_ID"), null, base);
        }
        if (hasKnownId(next, generatedId)) {
          return prepared(fail("GENERATED_ID_COLLISION"), null, base);
        }
        var item = {
          id: generatedId,
          request_id: input.request_id,
          scenario: scenario,
          field: input.field,
          previous_value: previousValue,
          proposed_value: input.value,
          baseline_version: next.policy_version,
          rationale: input.rationale,
          risk: assessment.risk,
          policy: assessment,
          created_at: nowIso(),
          status: "pending"
        };
        next.pending.push(item);
        next.last_decision = {
          ok: true,
          reason: "PROPOSAL_ADMITTED",
          id: item.id,
          field: item.field,
          risk: item.risk,
          decided_at: nowIso()
        };
        var admitted = ok({
          change_id: item.id,
          request_id: item.request_id,
          status: item.status,
          risk: item.risk,
          policy_code: item.policy.code,
          applied: false
        });
        setOwn(next.requests, input.request_id, {
          digest: requestDigest,
          result: Core.cloneJson(admitted)
        });
        return prepared(admitted, next, base);
      }

      async function prepareArm(id, operation) {
        var base = revision;
        var next = effectiveState();
        if (typeof id !== "string" || !id || codePointLength(id) > limits.id
          || OPERATIONS.indexOf(operation) === -1) {
          return prepared(fail("INVALID_ARM_REQUEST"), null, base);
        }
        var item = operation === "rollback_change"
          ? next.applied.find(function (candidate) {
            return candidate.id === id && !candidate.rolled_back_at;
          }) || null
          : findPending(next, id);
        if (!item) return prepared(fail("NOT_FOUND", { id: id }), null, base);
        var untilTick = nowTick() + armMs;
        next.armed = {
          id: id,
          operation: operation,
          binding_digest: await binding(item, operation),
          until_tick: untilTick,
          expires_at: new Date(wallNow() + armMs).toISOString()
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
        if (targetState.armed.operation !== operation) {
          return fail("ARM_OPERATION_MISMATCH", { id: item.id });
        }
        var currentBinding = await binding(item, operation);
        if (nowTick() >= targetState.armed.until_tick) {
          targetState.armed = null;
          return fail("USER_ACTIVATION_REQUIRED", { id: item.id });
        }
        if (targetState.armed.binding_digest !== currentBinding) {
          targetState.armed = null;
          return fail("ARM_CONTENT_MISMATCH", { id: item.id });
        }
        targetState.armed = null;
        return ok({ authorized: true });
      }

      async function prepareApply(input) {
        var base = revision;
        var next = effectiveState();
        if (!exactObject(input, ["id"]) || typeof input.id !== "string" || !input.id
          || codePointLength(input.id) > limits.id) {
          return prepared(fail("INVALID_INPUT"), null, base);
        }
        var item = findPending(next, input.id);
        if (!item) return prepared(fail("NOT_FOUND", { id: input.id }), null, base);
        var hadArm = !!next.armed;
        var admission = await authorize(next, item, "apply_change");
        if (!admission.ok) {
          return prepared(admission, hadArm && !next.armed ? next : null, base);
        }
        if (next.policy_version !== item.baseline_version
          || !sameJson(next.values[item.field], item.previous_value)) {
          return prepared(fail("STALE_BASELINE", { id: item.id, field: item.field }), next, base);
        }
        next.values[item.field] = item.proposed_value;
        next.policy_version += 1;
        item.status = "applied";
        next.pending = next.pending.filter(function (candidate) { return candidate.id !== item.id; });
        next.applied.push({
          id: item.id,
          scenario: item.scenario,
          field: item.field,
          before: item.previous_value,
          after: item.proposed_value,
          baseline_version: item.baseline_version,
          applied_version: next.policy_version,
          rationale: item.rationale,
          risk: item.risk,
          status: "applied",
          created_at: item.created_at,
          applied_at: nowIso()
        });
        next.last_decision = {
          ok: true,
          reason: "CHANGE_APPLIED",
          id: item.id,
          field: item.field,
          decided_at: nowIso()
        };
        return prepared(ok({
          id: item.id,
          field: item.field,
          before: item.previous_value,
          after: item.proposed_value,
          applied: true,
          policy_version: next.policy_version,
          count: next.applied.length
        }), next, base);
      }

      async function prepareReject(input) {
        var base = revision;
        var next = effectiveState();
        if (!exactObject(input, ["id"]) || typeof input.id !== "string" || !input.id
          || codePointLength(input.id) > limits.id) {
          return prepared(fail("INVALID_INPUT"), null, base);
        }
        var item = findPending(next, input.id);
        if (!item) return prepared(fail("NOT_FOUND", { id: input.id }), null, base);
        var hadArm = !!next.armed;
        var admission = await authorize(next, item, "reject_change");
        if (!admission.ok) {
          return prepared(admission, hadArm && !next.armed ? next : null, base);
        }
        item.status = "rejected";
        next.pending = next.pending.filter(function (candidate) { return candidate.id !== item.id; });
        next.rejected.push({
          id: item.id,
          field: item.field,
          proposed_value: item.proposed_value,
          rejected_at: nowIso()
        });
        next.last_decision = {
          ok: true,
          reason: "CHANGE_REJECTED",
          id: item.id,
          field: item.field,
          decided_at: nowIso()
        };
        return prepared(ok({ id: item.id, rejected: true }), next, base);
      }

      async function prepareRollback(input) {
        var base = revision;
        var next = effectiveState();
        if (!exactObject(input, ["id"]) || typeof input.id !== "string" || !input.id
          || codePointLength(input.id) > limits.id) {
          return prepared(fail("INVALID_INPUT"), null, base);
        }
        var item = next.applied.find(function (candidate) {
          return candidate.id === input.id && !candidate.rolled_back_at;
        });
        if (!item) return prepared(fail("NOT_FOUND", { id: input.id }), null, base);
        var hadArm = !!next.armed;
        var admission = await authorize(next, item, "rollback_change");
        if (!admission.ok) {
          return prepared(admission, hadArm && !next.armed ? next : null, base);
        }
        if (next.policy_version !== item.applied_version
          || !sameJson(next.values[item.field], item.after)) {
          return prepared(fail("STALE_BASELINE", { id: item.id, field: item.field }), next, base);
        }
        next.values[item.field] = item.before;
        next.policy_version += 1;
        item.status = "rolled_back";
        item.rolled_back_at = nowIso();
        item.rolled_back_version = next.policy_version;
        next.rolled_back.push({
          id: item.id,
          field: item.field,
          from: item.after,
          to: item.before,
          applied_version: item.applied_version,
          rolled_back_version: item.rolled_back_version,
          rolled_back_at: item.rolled_back_at
        });
        next.last_decision = {
          ok: true,
          reason: "CHANGE_ROLLED_BACK",
          id: item.id,
          field: item.field,
          decided_at: nowIso()
        };
        return prepared(ok({
          id: item.id,
          field: item.field,
          from: item.after,
          to: item.before,
          policy_version: next.policy_version,
          rolled_back: true
        }), next, base);
      }

      async function snapshot() {
        await tail;
        var view = effectiveState();
        return Core.cloneJson({
          scenario: scenario,
          goal: view.goal,
          values: view.values,
          policy_version: view.policy_version,
          pending: view.pending,
          applied: view.applied,
          rejected: view.rejected,
          rolled_back: view.rolled_back,
          armed: view.armed ? {
            id: view.armed.id,
            operation: view.armed.operation,
            binding_digest: view.armed.binding_digest,
            expires_at: view.armed.expires_at
          } : null,
          last_decision: view.last_decision,
          idempotency_key_count: Object.keys(view.requests).length
        });
      }

      return {
        setGoal: function (value) { return runPrepared(function () { return prepareSetGoal(value); }); },
        propose: function (input) { return runPrepared(function () { return preparePropose(input); }); },
        arm: function (id, operation) { return runPrepared(function () { return prepareArm(id, operation); }); },
        apply: function (input) { return runPrepared(function () { return prepareApply(input); }); },
        reject: function (input) { return runPrepared(function () { return prepareReject(input); }); },
        rollback: function (input) { return runPrepared(function () { return prepareRollback(input); }); },
        prepareSetGoal: prepareSetGoal,
        preparePropose: preparePropose,
        prepareArm: prepareArm,
        prepareApply: prepareApply,
        prepareReject: prepareReject,
        prepareRollback: prepareRollback,
        snapshot: snapshot,
        catalog: catalog,
        limits: Object.assign({}, limits, { arm_ms: armMs })
      };
    }

    return Object.freeze({
      scenario: scenario,
      fields: Object.freeze(fields.slice()),
      limits: Object.freeze(Object.assign({}, limits)),
      catalog: catalog,
      inputSchemas: inputSchemas,
      initialValues: function () { return Core.cloneJson(initialValues); },
      validateFieldValue: function (field, value) { return validateValue(definitions, field, value); },
      assessChange: assessChange,
      createWorkbench: createWorkbench
    });
  }

  return Object.freeze({
    defineAdapter: defineAdapter,
    operations: Object.freeze(OPERATIONS.slice()),
    risks: Object.freeze(RISKS.slice()),
    defaultLimits: Object.freeze(Object.assign({}, DEFAULT_LIMITS))
  });
});
