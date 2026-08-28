/* Ceiling page controller: explicit authority, one-use activation, receipts. */
(function () {
  "use strict";

  var Core = window.CeilingCore;
  var ChangeControl = window.CeilingChangeControl;
  var Probes = window.CeilingProbes;
  if (!Core || !ChangeControl || !Probes) throw new Error("CEILING_CORE_MISSING");

  var chain = Core.createReceiptChain({ crypto: crypto });
  var workbench = ChangeControl.createWorkbench({ crypto: crypto, armMs: 15000 });
  var READ_ONLY_TRUSTED = { readOnlyHint: true, untrustedContentHint: false };
  var READ_ONLY_UNTRUSTED = { readOnlyHint: true, untrustedContentHint: true };
  var MUTATING_UNTRUSTED = { readOnlyHint: false, untrustedContentHint: true };
  var TOOL_OUTPUT_MAX = 1500;
  var GOAL_PREVIEW_MAX = 120;
  var RATIONALE_PREVIEW_MAX = 96;
  var REASON_PREVIEW_MAX = 96;
  var RECEIPT_MAX = 100;
  var RECEIPT_RESERVE = 20;
  var probeResults = null;
  var renderTail = Promise.resolve();
  var recorder = Core.createActionRecorder({
    chain: chain,
    max: RECEIPT_MAX,
    reserve: RECEIPT_RESERVE,
    onAppend: scheduleRender
  });

  function $(id) { return document.getElementById(id); }
  function ok(data) { return { ok: true, data: data }; }

  function fail(reason, extra) {
    var result = { ok: false, reason: reason };
    if (extra) Object.keys(extra).forEach(function (key) { result[key] = extra[key]; });
    return result;
  }

  function record(tool, input, prepare, options) {
    return recorder.record(tool, input, prepare, options);
  }

  function codePointLength(value) { return Array.from(value).length; }

  function clipText(value, maximum) {
    if (typeof value !== "string" || codePointLength(value) <= maximum) return value;
    return Array.from(value).slice(0, maximum - 3).join("") + "...";
  }

  function outputLength(value) {
    try {
      return codePointLength(JSON.stringify(value));
    } catch (error) {
      return Infinity;
    }
  }

  function boundedReadResult(result) {
    var observed = outputLength(result);
    return observed <= TOOL_OUTPUT_MAX
      ? result
      : fail("OUTPUT_LIMIT_EXCEEDED", { limit: TOOL_OUTPUT_MAX, observed: observed });
  }

  function boundedWriteResult(result) {
    if (outputLength(result) <= TOOL_OUTPUT_MAX) return result;
    var summary = {
      ok: !!(result && result.ok === true),
      summarized: true,
      summary_reason: "OUTPUT_BUDGET",
      limit: TOOL_OUTPUT_MAX
    };
    if (result && typeof result.reason === "string") {
      summary.reason = clipText(result.reason, REASON_PREVIEW_MAX);
    }
    if (result && typeof result.receipt_recorded === "boolean") {
      summary.receipt_recorded = result.receipt_recorded;
    }
    if (result && result.data && Object.prototype.toString.call(result.data) === "[object Object]") {
      summary.data = {};
      [
        "change_id", "request_id", "id", "field", "status", "risk",
        "policy_code", "applied", "rejected", "policy_version", "count"
      ].forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(result.data, key)
          && ["string", "number", "boolean"].indexOf(typeof result.data[key]) !== -1) {
          summary.data[key] = typeof result.data[key] === "string"
            ? clipText(result.data[key], REASON_PREVIEW_MAX)
            : result.data[key];
        }
      });
    }
    return summary;
  }

  function exactKeys(input, keys) {
    try {
      if (!input || Object.prototype.toString.call(input) !== "[object Object]") return false;
      var reflected = Reflect.ownKeys(input);
      if (reflected.some(function (key) { return typeof key !== "string"; })) return false;
      if (Core.canonicalJson(reflected.slice().sort()) !== Core.canonicalJson(keys.slice().sort())) return false;
      Core.canonicalJson(input);
      return Core.canonicalJson(Object.keys(input).sort()) === Core.canonicalJson(keys.slice().sort());
    } catch (error) {
      return false;
    }
  }

  function exactEmptyObject(input) {
    return exactKeys(input, []);
  }

  function exactObject(input, keys) {
    return exactKeys(input, keys);
  }

  function trustedUserActivation(event) {
    if (!event || event.isTrusted !== true) return false;
    var activation = typeof navigator !== "undefined" ? navigator.userActivation : null;
    return !activation || activation.isActive === true;
  }

  async function workspaceSnapshot() {
    var state = await workbench.snapshot();
    var verification = await chain.verify();
    var goal = clipText(state.goal, GOAL_PREVIEW_MAX);
    return {
      scenario: state.scenario,
      goal: goal,
      goal_truncated: goal !== state.goal,
      policy: state.policy,
      policy_version: state.policy_version,
      fields: workbench.catalog().map(function (field) { return field.name; }),
      pending_total: state.pending.length,
      pending: state.pending.slice(0, 2).map(function (item) {
        var rationale = clipText(item.rationale, RATIONALE_PREVIEW_MAX);
        return {
          id: item.id,
          field: item.field,
          previous_value: item.previous_value,
          proposed_value: item.proposed_value,
          baseline_version: item.baseline_version,
          rationale: rationale,
          rationale_truncated: rationale !== item.rationale,
          risk: item.risk,
          policy_code: item.policy.code
        };
      }),
      applied_total: state.applied.length,
      rejected_total: state.rejected.length,
      armed: state.armed ? {
        id: state.armed.id,
        operation: state.armed.operation,
        expires_at: state.armed.expires_at
      } : null,
      last_decision: state.last_decision ? {
        ok: state.last_decision.ok,
        reason: state.last_decision.reason,
        id: state.last_decision.id || null,
        field: state.last_decision.field || null,
        risk: state.last_decision.risk
          || (state.last_decision.policy && state.last_decision.policy.risk) || null,
        policy_code: state.last_decision.policy ? state.last_decision.policy.code : null,
        reasons: state.last_decision.policy
          ? state.last_decision.policy.reasons.slice(0, 2).map(function (reason) {
            return clipText(reason, REASON_PREVIEW_MAX);
          })
          : []
      } : null,
      receipt_n: verification.count,
      chain: verification.ok ? "ok" : "BROKEN",
      chain_errors: verification.errors
    };
  }

  async function receiptSnapshot() {
    var rows = await chain.snapshot();
    var verification = await chain.verify(rows);
    return {
      captured_at_call: true,
      chain: verification.ok ? "ok" : "BROKEN",
      verification: {
        ok: verification.ok,
        count: verification.count,
        tip: verification.tip,
        errors: verification.errors.slice(0, 4)
      },
      omitted: Math.max(0, rows.length - 2),
      receipts: rows.slice(-2).map(function (row) {
        return {
          seq: row.seq,
          ts: row.ts,
          tool: row.tool,
          result_ok: row.result_ok,
          reason: row.reason,
          input_digest: row.input_digest,
          result_digest: row.result_digest,
          hash: row.hash
        };
      }),
      full_evidence: "Available only through the user-triggered local evidence download."
    };
  }

  function registrationLabel(status) {
    if (!status.api_present) return "WebMCP unsupported";
    if (status.state === "pending") return "WebMCP registering " + status.registered + "/" + status.expected;
    if (status.state === "ready") return "WebMCP ready " + status.registered + "/" + status.expected;
    if (status.state === "partial") return "WebMCP partial " + status.registered + "/" + status.expected;
    if (status.state === "failed") return "WebMCP registration failed";
    return "WebMCP API present";
  }

  function makeButton(label, className, handler) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = className || "";
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }

  function focusPending(id) {
    return scheduleRender().then(function () {
      var items = Array.from(document.querySelectorAll("#pending-list .item"));
      var item = items.find(function (node) { return node.dataset.pendingId === id; });
      var button = item && item.querySelector("button");
      if (button) button.focus();
    });
  }

  function focusPendingAction(id, operation) {
    return scheduleRender().then(function () {
      var items = Array.from(document.querySelectorAll("#pending-list .item"));
      var item = items.find(function (node) { return node.dataset.pendingId === id; });
      var buttons = item ? Array.from(item.querySelectorAll("button")) : [];
      var button = buttons.find(function (node) {
        return node.dataset.pendingAction === operation;
      });
      if (button) button.focus();
    });
  }

  function focusResult() {
    return scheduleRender().then(function () {
      var target = $("flow-effect");
      if (target) target.focus();
    });
  }

  function setFlowState(id, state, label) {
    var step = $(id);
    var output = $(id + "-state");
    if (step) step.dataset.state = state;
    if (output) output.textContent = label;
  }

  function renderProbeMatrix() {
    var node = $("probe-list");
    if (!node) return;
    var byName = {};
    (probeResults || []).forEach(function (entry) { byName[entry.name] = entry; });
    node.replaceChildren();
    Probes.list().forEach(function (probe) {
      var entry = byName[probe.name];
      var article = document.createElement("article");
      article.className = "probe";
      article.dataset.state = entry ? (entry.ok ? "pass" : "fail") : "idle";
      var title = document.createElement("b");
      title.textContent = probe.title;
      var body = document.createElement("span");
      body.textContent = probe.proves;
      var output = document.createElement("output");
      output.textContent = entry ? (entry.ok ? "PASS" : "FAIL") : "waiting";
      article.appendChild(title);
      article.appendChild(body);
      article.appendChild(output);
      node.appendChild(article);
    });
  }

  function fieldDefinition(name) {
    return workbench.catalog().find(function (entry) { return entry.name === name; }) || null;
  }

  function fieldLabel(name) {
    var definition = fieldDefinition(name);
    return definition ? definition.label : name;
  }

  function formatValue(value) {
    return typeof value === "string" ? value : JSON.stringify(value);
  }

  function makeRisk(risk) {
    var badge = document.createElement("span");
    badge.className = "risk " + risk;
    badge.textContent = risk + " risk";
    return badge;
  }

  function makeDiff(before, after) {
    var grid = document.createElement("div");
    grid.className = "diff-grid";
    var beforeCell = document.createElement("div");
    beforeCell.className = "diff-cell";
    var beforeLabel = document.createElement("b");
    beforeLabel.textContent = "Current";
    var beforeValue = document.createElement("code");
    beforeValue.textContent = formatValue(before);
    beforeCell.appendChild(beforeLabel);
    beforeCell.appendChild(beforeValue);
    var arrow = document.createElement("div");
    arrow.className = "diff-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";
    var afterCell = document.createElement("div");
    afterCell.className = "diff-cell";
    var afterLabel = document.createElement("b");
    afterLabel.textContent = "Proposed";
    var afterValue = document.createElement("code");
    afterValue.textContent = formatValue(after);
    afterCell.appendChild(afterLabel);
    afterCell.appendChild(afterValue);
    grid.appendChild(beforeCell);
    grid.appendChild(arrow);
    grid.appendChild(afterCell);
    return grid;
  }

  async function renderNow() {
    var state = await workbench.snapshot();
    var receipts = await chain.snapshot();
    var verification = await chain.verify(receipts);
    var mcp = window.XclWebMCP;
    var registration = mcp ? mcp.registration() : {
      api_present: false,
      state: "unsupported",
      expected: 0,
      pending: 0,
      registered: 0,
      failed: 0
    };

    var chip = $("mcp-chip");
    if (chip) {
      chip.textContent = registrationLabel(registration);
      chip.className = "chip " + (registration.state === "ready" ? "ok" : (
        registration.state === "failed" || registration.state === "partial" ? "no" : ""
      ));
    }

    var errorNode = $("mcp-errors");
    if (errorNode && mcp && mcp.errors.length) {
      errorNode.hidden = false;
      errorNode.textContent = "Registration errors: " + JSON.stringify(mcp.errors);
    }

    var ceilingNode = $("ceiling-json");
    if (ceilingNode && mcp) ceilingNode.textContent = JSON.stringify(mcp.ceiling(), null, 2);
    if ($("goal-view")) $("goal-view").textContent = state.goal || "(no goal set)";
    if ($("arm-view")) {
      $("arm-view").textContent = state.armed
        ? state.armed.operation + " for " + state.armed.id + " until " + state.armed.expires_at
        : "not armed";
    }

    var policyNode = $("policy-list");
    if (policyNode) {
      policyNode.replaceChildren();
      workbench.catalog().forEach(function (definition) {
        var row = document.createElement("div");
        row.className = "policy-row";
        var term = document.createElement("dt");
        term.textContent = definition.label;
        var detail = document.createElement("dd");
        detail.textContent = formatValue(state.policy[definition.name]);
        row.appendChild(term);
        row.appendChild(detail);
        policyNode.appendChild(row);
      });
    }

    if ($("queue-count")) {
      $("queue-count").textContent = state.pending.length + (state.pending.length === 1 ? " pending" : " pending");
    }

    var decisionNode = $("decision-view");
    if (decisionNode) {
      if (!state.last_decision) {
        decisionNode.dataset.state = "idle";
        decisionNode.textContent = "No policy decision yet.";
      } else if (state.last_decision.ok) {
        decisionNode.dataset.state = "pass";
        decisionNode.textContent = state.last_decision.reason.replace(/_/g, " ").toLowerCase()
          + (state.last_decision.field ? " · " + fieldLabel(state.last_decision.field) : "");
      } else {
        decisionNode.dataset.state = "fail";
        decisionNode.textContent = "policy denied · " + fieldLabel(state.last_decision.field)
          + " · " + state.last_decision.policy.code;
      }
    }

    var chainNode = $("chain-view");
    if (chainNode) {
      chainNode.textContent = verification.ok
        ? "chain verified · " + verification.count
        : "chain broken · " + verification.errors.length;
      chainNode.className = "chip " + (verification.ok ? "ok" : "no");
    }

    setFlowState(
      "flow-proposal",
      state.pending.length ? "active" : (state.applied.length || state.rejected.length ? "pass" : "idle"),
      state.pending.length
        ? state.pending.length + " pending"
        : (state.applied.length || state.rejected.length ? "proposal resolved" : "idle")
    );
    setFlowState(
      "flow-authority",
      state.armed ? "active" : (state.applied.length || state.rejected.length ? "pass" : "idle"),
      state.armed
        ? state.armed.operation + " · " + state.armed.id
        : (state.applied.length || state.rejected.length ? "one-use arm consumed" : "required")
    );
    setFlowState(
      "flow-effect",
      state.applied.length || state.rejected.length ? "pass" : "idle",
      state.applied.length
        ? state.applied.length + " applied"
        : (state.rejected.length ? state.rejected.length + " rejected" : "no effect")
    );
    setFlowState(
      "flow-evidence",
      verification.ok && verification.count ? "pass" : (verification.ok ? "idle" : "fail"),
      verification.ok
        ? (verification.count ? verification.count + " receipts verified" : "waiting")
        : verification.errors.length + " verification errors"
    );

    var pendingNode = $("pending-list");
    if (pendingNode) {
      var activeElement = document.activeElement;
      var pendingFocus = activeElement && activeElement.dataset
        && activeElement.dataset.pendingId && activeElement.dataset.pendingAction
        ? {
          id: activeElement.dataset.pendingId,
          action: activeElement.dataset.pendingAction
        }
        : null;
      pendingNode.innerHTML = "";
      if (!state.pending.length) {
        var emptyPending = document.createElement("p");
        emptyPending.className = "dim";
        emptyPending.textContent = "No changes await a human decision.";
        pendingNode.appendChild(emptyPending);
      } else {
        state.pending.forEach(function (pending) {
          var article = document.createElement("article");
          article.className = "item";
          article.dataset.pendingId = pending.id;
          var title = document.createElement("h3");
          title.textContent = fieldLabel(pending.field) + " · " + pending.id;
          var risk = makeRisk(pending.risk);
          var diff = makeDiff(pending.previous_value, pending.proposed_value);
          var rationale = document.createElement("p");
          rationale.className = "dim";
          rationale.textContent = "Agent rationale: " + pending.rationale;
          var policy = document.createElement("p");
          policy.className = "dim";
          policy.textContent = "Policy: " + pending.policy.code + " · " + pending.policy.reasons.join(" ");
          var request = document.createElement("p");
          request.className = "dim";
          request.textContent = "Request id: " + pending.request_id;
          var row = document.createElement("div");
          row.className = "row";
          var confirmButton = makeButton("Confirm and apply", "", function (event) {
            return humanConfirmApply(pending.id, event);
          });
          confirmButton.dataset.pendingAction = "confirm_apply";
          var rejectButton = makeButton("Reject now", "danger", function (event) {
            return humanReject(pending.id, event);
          });
          rejectButton.dataset.pendingAction = "reject_now";
          var armApplyButton = makeButton("Arm apply for agent", "ghost", function (event) {
            return humanArm(pending.id, "apply_change", event);
          });
          armApplyButton.dataset.pendingAction = "apply_change";
          var armRejectButton = makeButton("Arm reject for agent", "ghost", function (event) {
            return humanArm(pending.id, "reject_change", event);
          });
          armRejectButton.dataset.pendingAction = "reject_change";
          [confirmButton, rejectButton, armApplyButton, armRejectButton].forEach(function (button) {
            button.dataset.pendingId = pending.id;
          });
          row.appendChild(confirmButton);
          row.appendChild(rejectButton);
          row.appendChild(armApplyButton);
          row.appendChild(armRejectButton);
          article.appendChild(title);
          article.appendChild(risk);
          article.appendChild(diff);
          article.appendChild(rationale);
          article.appendChild(policy);
          article.appendChild(request);
          article.appendChild(row);
          pendingNode.appendChild(article);
        });
      }
      if (pendingFocus) {
        var focusedItem = Array.from(document.querySelectorAll("#pending-list .item"))
          .find(function (node) { return node.dataset.pendingId === pendingFocus.id; });
        var focusedButton = focusedItem
          ? Array.from(focusedItem.querySelectorAll("button")).find(function (node) {
            return node.dataset.pendingAction === pendingFocus.action;
          })
          : null;
        if (focusedButton) focusedButton.focus();
      }
    }

    var appliedNode = $("applied-list");
    if (appliedNode) {
      appliedNode.innerHTML = "";
      if (!state.applied.length) {
        var emptyApplied = document.createElement("p");
        emptyApplied.className = "dim";
        emptyApplied.textContent = "Nothing applied this session.";
        appliedNode.appendChild(emptyApplied);
      } else {
        state.applied.forEach(function (applied) {
          var article = document.createElement("article");
          article.className = "item";
          var title = document.createElement("h3");
          title.textContent = fieldLabel(applied.field) + " · " + applied.id;
          var diff = makeDiff(applied.before, applied.after);
          var rationale = document.createElement("p");
          rationale.className = "dim";
          rationale.textContent = "Rationale: " + applied.rationale;
          var status = document.createElement("p");
          status.className = "dim";
          status.textContent = applied.rolled_back_at
            ? "Rolled back at " + applied.rolled_back_at
            : "Applied at " + applied.applied_at;
          article.appendChild(title);
          article.appendChild(makeRisk(applied.risk));
          article.appendChild(diff);
          article.appendChild(rationale);
          article.appendChild(status);
          if (!applied.rolled_back_at) {
            var rollbackButton = makeButton("Rollback change", "danger", function (event) {
              return humanRollback(applied.id, event);
            });
            rollbackButton.dataset.appliedId = applied.id;
            article.appendChild(rollbackButton);
          }
          appliedNode.appendChild(article);
        });
      }
    }

    if ($("receipts")) $("receipts").textContent = JSON.stringify(receipts, null, 2);
    if ($("inspector")) {
      $("inspector").textContent = JSON.stringify({
        registration: registration,
        declared: mcp ? mcp.ceiling().declared : [],
        errors: mcp ? mcp.errors : [],
        release_policy: state.policy,
        policy_version: state.policy_version,
        receipt_verification: verification
      }, null, 2);
    }
    renderProbeMatrix();
  }

  function scheduleRender() {
    renderTail = renderTail.then(renderNow, renderNow);
    return renderTail;
  }

  async function humanArm(id, operation, event) {
    if (!trustedUserActivation(event)) return fail("TRUSTED_USER_ACTIVATION_REQUIRED");
    var result = await record("user_arm", { id: id, operation: operation }, function () {
      return workbench.prepareArm(id, operation);
    }, { priority: true });
    if (result.ok) {
      await focusPendingAction(id, operation);
      setTimeout(scheduleRender, workbench.limits.arm_ms + 25);
    }
    return result;
  }

  async function humanConfirmApply(id, event) {
    var armed = await humanArm(id, "apply_change", event);
    if (!armed.ok) return armed;
    var result = await record("apply_change", { id: id }, function () {
      return workbench.prepareApply({ id: id });
    }, { priority: true });
    await focusResult();
    return result;
  }

  async function humanReject(id, event) {
    var armed = await humanArm(id, "reject_change", event);
    if (!armed.ok) return armed;
    var result = await record("reject_change", { id: id }, function () {
      return workbench.prepareReject({ id: id });
    }, { priority: true });
    await focusResult();
    return result;
  }

  async function humanRollback(id, event) {
    var armed = await humanArm(id, "rollback_change", event);
    if (!armed.ok) return armed;
    var result = await record("user_rollback", { id: id }, function () {
      return workbench.prepareRollback({ id: id });
    }, { priority: true });
    await focusResult();
    return result;
  }

  async function userExport(event) {
    if (!trustedUserActivation(event)) return fail("TRUSTED_USER_ACTIVATION_REQUIRED");
    var state = await workbench.snapshot();
    var receipts = await chain.snapshot();
    var verification = await chain.verify(receipts);
    if (!verification.ok) return fail("CHAIN_VERIFICATION_FAILED", { errors: verification.errors });
    var bundle = {
      format: "ceiling.evidence.v1",
      exported_at: new Date().toISOString(),
      boundary: window.XclWebMCP ? window.XclWebMCP.ceiling() : null,
      state: state,
      verification: verification,
      receipts: receipts
    };
    var blob = new Blob([JSON.stringify(bundle, null, 2) + "\n"], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "ceiling-evidence.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return ok({ downloaded: true, receipt_count: receipts.length, tip: verification.tip });
  }

  async function runAllProbes() {
    var button = $("run-probes");
    var summary = $("probe-summary");
    if (button) button.disabled = true;
    if (summary) summary.textContent = "running isolated probes...";
    try {
      probeResults = await Probes.runAll({ crypto: crypto });
      var passed = probeResults.filter(function (entry) { return entry.ok; }).length;
      if (summary) summary.textContent = passed + "/" + probeResults.length + " passed";
      await scheduleRender();
      return ok({ passed: passed, total: probeResults.length, results: probeResults });
    } catch (error) {
      if (summary) summary.textContent = "probe run failed";
      return fail("PROBE_RUN_FAILED", { message: String(error && error.message ? error.message : error) });
    } finally {
      if (button) button.disabled = false;
    }
  }

  function updateFieldHelp() {
    var definition = fieldDefinition($("change-field").value);
    if (!definition) return;
    var bounds = "";
    if (definition.enum) bounds = " Allowed: " + definition.enum.join(", ") + ".";
    if (typeof definition.minimum === "number") {
      bounds = " Allowed: " + definition.minimum + "–" + definition.maximum + ".";
    }
    if ($("field-help")) $("field-help").textContent = definition.description + bounds;
  }

  function parseInspectorValue(field, raw) {
    var definition = fieldDefinition(field);
    if (!definition) return { ok: false, reason: "UNKNOWN_FIELD" };
    if (definition.type === "boolean") {
      if (raw === "true") return ok(true);
      if (raw === "false") return ok(false);
      return fail("ENTER_TRUE_OR_FALSE");
    }
    if (definition.type === "integer") {
      if (!/^-?\d+$/.test(raw.trim())) return fail("ENTER_AN_INTEGER");
      return ok(Number(raw));
    }
    return ok(raw.trim());
  }

  function populateFieldSelector() {
    var select = $("change-field");
    if (!select) return;
    select.replaceChildren();
    workbench.catalog().forEach(function (definition) {
      var option = document.createElement("option");
      option.value = definition.name;
      option.textContent = definition.label;
      select.appendChild(option);
    });
    select.value = "rollback_window_minutes";
    $("change-value").value = "45";
    updateFieldHelp();
  }

  function proposeInspectorChange(input) {
    return record("propose_change", input, function () {
      return workbench.preparePropose(input);
    }, { priority: true }).then(function (result) {
      if (result.ok) focusPending(result.data.change_id);
      return result;
    });
  }

  function bindUi() {
    populateFieldSelector();
    $("change-field").addEventListener("change", updateFieldHelp);
    $("goal-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var value = $("goal-input").value;
      record("user_set_goal", { goal: value }, function () {
        return workbench.prepareSetGoal(value);
      }, { priority: true });
    });
    $("change-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var field = $("change-field").value;
      var parsed = parseInspectorValue(field, $("change-value").value);
      if (!parsed.ok) {
        $("decision-view").dataset.state = "fail";
        $("decision-view").textContent = "Input refused · " + parsed.reason;
        return;
      }
      var input = {
        request_id: "ui-" + Date.now() + "-" + Math.floor(Math.random() * 1000000),
        scenario: ChangeControl.scenario,
        field: field,
        value: parsed.data,
        rationale: $("change-rationale").value
      };
      proposeInspectorChange(input);
    });
    $("load-safe-example").addEventListener("click", function (event) {
      $("change-field").value = "rollback_window_minutes";
      $("change-value").value = "45";
      $("change-rationale").value = "Extend the recovery window before moving the synthetic release policy toward production.";
      updateFieldHelp();
    });
    $("try-blocked-example").addEventListener("click", function (event) {
      proposeInspectorChange({
        request_id: "ui-deny-" + Date.now() + "-" + Math.floor(Math.random() * 1000000),
        scenario: ChangeControl.scenario,
        field: "require_signed_artifacts",
        value: false,
        rationale: "Attempt to admit unsigned artifacts as an adversarial policy test."
      });
    });
    $("demo-apply-blind").addEventListener("click", async function (event) {
      var state = await workbench.snapshot();
      var id = state.pending[0] ? state.pending[0].id : "c-missing";
      record("apply_change", { id: id }, function () {
        return workbench.prepareApply({ id: id });
      }, { priority: true });
    });
    $("download-evidence").addEventListener("click", async function (event) {
      $("export-status").textContent = "Preparing verified session bundle...";
      var result = await userExport(event);
      $("export-status").textContent = result.ok
        ? "Downloaded " + result.data.receipt_count + " receipts."
        : "Export refused: " + result.reason;
    });
    $("run-probes").addEventListener("click", function () { runAllProbes(); });
  }

  function registerCeilingTools() {
    var mcp = window.XclWebMCP;
    if (!mcp || !mcp.apiPresent) return;

    function executeRead(operation) {
      return async function (input, options) {
        var normalized = typeof input === "undefined" ? {} : input;
        var signal = options && options.signal;
        if (!exactEmptyObject(normalized)) return fail("INVALID_INPUT");
        if (signal && signal.aborted) return fail("ABORTED");
        var result = await operation(normalized, signal);
        if (signal && signal.aborted) return fail("ABORTED");
        return boundedReadResult(result);
      };
    }

    function executeWrite(name, prepare, recordOptions) {
      return async function (input, options) {
        var normalized = typeof input === "undefined" ? {} : input;
        var result = await record(name, normalized, function () {
          return prepare(normalized);
        }, Object.assign({}, recordOptions || {}, {
          signal: options && options.signal
        }));
        await scheduleRender();
        return boundedWriteResult(result);
      };
    }

    var empty = { type: "object", additionalProperties: false, properties: {} };
    var adapterSchemas = ChangeControl.inputSchemas();
    var idSchema = adapterSchemas.decision;
    var proposeSchema = adapterSchemas.proposal;
    var probeSchema = {
      type: "object",
      additionalProperties: false,
      required: ["scenario"],
      properties: {
        scenario: {
          type: "string",
          enum: Probes.names.slice(),
          description: "Exact isolated synthetic boundary probe to run."
        }
      }
    };

    async function executeProbe(input, options) {
      var signal = options && options.signal;
      if (!exactObject(input, ["scenario"]) || typeof input.scenario !== "string"
        || Probes.names.indexOf(input.scenario) === -1) {
        return fail("INVALID_INPUT");
      }
      if (signal && signal.aborted) return fail("ABORTED");
      var probe = await Probes.run(input.scenario, { crypto: crypto, signal: signal });
      if (signal && signal.aborted) return fail("ABORTED");
      return boundedReadResult(ok(probe));
    }

    [
      {
        name: "get_workspace",
        title: "Inspect release-policy workspace",
        description: "Return a compact synthetic release-policy summary, field names, up to two pending diffs, current page-activation arm, last decision, and receipt checkpoint. Exact field constraints are in this tool contract; rationale is untrusted.",
        inputSchema: empty,
        annotations: READ_ONLY_UNTRUSTED,
        execute: executeRead(function () { return workspaceSnapshot().then(ok); })
      },
      {
        name: "get_receipts",
        title: "Get receipt chain",
        description: "Return compact verification metadata and digest fields from the latest two in-memory receipts. Read-only and session-local.",
        inputSchema: empty,
        annotations: READ_ONLY_TRUSTED,
        execute: executeRead(function () { return receiptSnapshot().then(ok); })
      },
      {
        name: "list_boundary_probes",
        title: "List boundary probes",
        description: "Return the seven isolated synthetic probes available for the implemented authority and receipt core. Read-only and session-independent.",
        inputSchema: empty,
        annotations: READ_ONLY_TRUSTED,
        execute: executeRead(function () { return Promise.resolve(ok(Probes.list())); })
      },
      {
        name: "run_boundary_probe",
        title: "Run one boundary probe",
        description: "Run one declared synthetic probe in isolated in-memory state and return its expected and observed result. Does not change the shared task or its receipts.",
        inputSchema: probeSchema,
        annotations: READ_ONLY_TRUSTED,
        execute: executeProbe
      },
      {
        name: "propose_change",
        title: "Propose one release-policy change",
        description: "Validate and queue one typed in-memory release-policy diff with rationale. Hard policy invariants refuse unsafe values; this tool cannot apply an admitted change.",
        inputSchema: proposeSchema,
        annotations: MUTATING_UNTRUSTED,
        execute: executeWrite("propose_change", function (input) {
          return workbench.preparePropose(input);
        })
      },
      {
        name: "apply_change",
        title: "Apply one admitted change",
        description: "Apply one pending synthetic release-policy diff only when its exact id, baseline, content, and operation have a live one-use trusted page-activation arm.",
        inputSchema: idSchema,
        annotations: MUTATING_UNTRUSTED,
        execute: executeWrite("apply_change", function (input) {
          return workbench.prepareApply(input);
        }, { allowReserveOnSuccess: true })
      },
      {
        name: "reject_change",
        title: "Reject one admitted change",
        description: "Reject one pending synthetic release-policy diff only when its exact id, content, and operation have a live one-use trusted page-activation arm.",
        inputSchema: idSchema,
        annotations: MUTATING_UNTRUSTED,
        execute: executeWrite("reject_change", function (input) {
          return workbench.prepareReject(input);
        }, { allowReserveOnSuccess: true })
      }
    ].forEach(mcp.register);
  }

  async function selfTest() {
    var isolated = ChangeControl.createWorkbench({ crypto: crypto, armMs: 15000 });
    var proposed = await isolated.propose({
      request_id: "self-test-1",
      scenario: ChangeControl.scenario,
      field: "rollback_window_minutes",
      value: 45,
      rationale: "Self-test must remain pending without a trusted activation."
    });
    var result = await isolated.apply({ id: proposed.data.change_id });
    var pass = result.ok === false && result.reason === "USER_ACTIVATION_REQUIRED";
    if ($("selftest")) {
      $("selftest").textContent = pass
        ? "self-test passed · unarmed effect refused"
        : "self-test failed";
      $("selftest").className = "chip " + (pass ? "ok" : "no");
    }
  }

  window.addEventListener("xcl:webmcp-registration", scheduleRender);
  window.CeilingDemo = {
    inspect: async function () {
      return {
        state: await workbench.snapshot(),
        receipts: await chain.snapshot(),
        verification: await chain.verify()
      };
    },
    runAllProbes: runAllProbes
  };

  document.addEventListener("DOMContentLoaded", function () {
    bindUi();
    registerCeilingTools();
    scheduleRender();
    selfTest();
  });
})();
