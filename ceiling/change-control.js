/* CeilingChangeControl - release-policy adapter for the universal engine. */
(function (root, factory) {
  "use strict";
  var core = root && root.CeilingCore;
  var universal = root && root.CeilingUniversalControl;
  if (typeof module === "object" && module.exports) {
    core = require("./core.js");
    universal = require("./universal-control.js");
  }
  var api = factory(core, universal);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CeilingChangeControl = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Core, Universal) {
  "use strict";

  if (!Core || !Universal || typeof Universal.defineAdapter !== "function") {
    throw new Error("CEILING_UNIVERSAL_CONTROL_MISSING");
  }

  var SCENARIO = "release_policy";
  var FIELD_ORDER = [
    "deployment_target",
    "max_parallel_releases",
    "require_signed_artifacts",
    "required_reviewers",
    "rollback_window_minutes"
  ];
  var FIELD_DEFINITIONS = {
    deployment_target: {
      label: "Deployment target",
      type: "string",
      enum: ["staging", "production"],
      description: "Where the synthetic release would be admitted."
    },
    max_parallel_releases: {
      label: "Parallel release ceiling",
      type: "integer",
      minimum: 1,
      maximum: 5,
      description: "Input range 1-5; release policy denies values above four."
    },
    require_signed_artifacts: {
      label: "Require signed artifacts",
      type: "boolean",
      description: "Hard invariant: unsigned artifacts remain forbidden."
    },
    required_reviewers: {
      label: "Required reviewers",
      type: "integer",
      minimum: 1,
      maximum: 4,
      description: "Human approvals required before a synthetic release."
    },
    rollback_window_minutes: {
      label: "Rollback window",
      type: "integer",
      minimum: 15,
      maximum: 120,
      description: "Minutes the synthetic rollback window remains open."
    }
  };
  var INITIAL_POLICY = {
    deployment_target: "staging",
    max_parallel_releases: 2,
    require_signed_artifacts: true,
    required_reviewers: 2,
    rollback_window_minutes: 30
  };

  function releaseAssessment(context) {
    var field = context.field;
    var previousValue = context.previousValue;
    var proposedValue = context.proposedValue;
    var risk = "low";
    var reasons = [];
    var allowed = true;
    var code = "POLICY_PASS";

    if (field === "require_signed_artifacts" && proposedValue === false) {
      risk = "critical";
      allowed = false;
      code = "SIGNED_ARTIFACTS_REQUIRED";
      reasons.push("The release policy never admits unsigned artifacts.");
    } else if (field === "max_parallel_releases" && proposedValue > 4) {
      risk = "high";
      allowed = false;
      code = "PARALLELISM_CEILING_EXCEEDED";
      reasons.push("The release policy caps parallel releases at four.");
    } else if (field === "deployment_target" && proposedValue === "production") {
      risk = "high";
      reasons.push("Moving from staging to production increases blast radius.");
    } else if (field === "required_reviewers" && proposedValue < previousValue) {
      risk = "high";
      reasons.push("Reducing required reviewers weakens separation of duties.");
    } else if (field === "rollback_window_minutes" && proposedValue < previousValue) {
      risk = "high";
      reasons.push("Shortening the rollback window reduces recovery time.");
    } else if (field === "max_parallel_releases" && proposedValue > previousValue) {
      risk = "medium";
      reasons.push("Increasing parallelism raises the concurrent change surface.");
    } else {
      reasons.push("The proposed value stays within the declared release policy.");
    }

    return { allowed: allowed, code: code, risk: risk, reasons: reasons };
  }

  var adapter = Universal.defineAdapter({
    scenario: SCENARIO,
    idPrefix: "c-",
    fieldOrder: FIELD_ORDER,
    fieldDefinitions: FIELD_DEFINITIONS,
    initialValues: INITIAL_POLICY,
    assessChange: releaseAssessment
  });

  function releaseSnapshot(snapshot) {
    var view = Core.cloneJson(snapshot);
    view.policy = view.values;
    delete view.values;
    return view;
  }

  function createWorkbench(options) {
    var workbench = adapter.createWorkbench(options);
    return Object.assign({}, workbench, {
      snapshot: async function () { return releaseSnapshot(await workbench.snapshot()); }
    });
  }

  return {
    createWorkbench: createWorkbench,
    assessChange: function (field, previousValue, proposedValue, policy) {
      var values = policy || adapter.initialValues();
      var result = adapter.assessChange(field, previousValue, proposedValue, values);
      return result.ok ? result.data : result;
    },
    validateFieldValue: adapter.validateFieldValue,
    fieldCatalog: adapter.catalog,
    inputSchemas: adapter.inputSchemas,
    initialPolicy: adapter.initialValues,
    scenario: adapter.scenario,
    fields: adapter.fields.slice(),
    limits: Object.assign({}, adapter.limits)
  };
});
