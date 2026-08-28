/* Shared page-level WebMCP allowlist for xclusivexo.com. */
(function () {
  "use strict";

  var READ_ONLY_TRUSTED = { readOnlyHint: true, untrustedContentHint: false };
  var READ_ONLY_UNTRUSTED = { readOnlyHint: true, untrustedContentHint: true };
  var TOOL_OUTPUT_MAX = 1500;
  var SITE_TOOLS = [
    "list_claim_ceiling",
    "list_public_work",
    "list_papers",
    "get_capability_statement"
  ];
  var CEILING_TOOLS = [
    "get_workspace",
    "get_receipts",
    "list_boundary_probes",
    "run_boundary_probe",
    "propose_change",
    "apply_change",
    "reject_change"
  ];
  var REFUSED = [
    "mail or social posting",
    "payment or purchase",
    "session or account takeover",
    "filesystem or host control",
    "ambient OS or computer-use authority"
  ];
  var WORK = [
    { name: "mcp-assure", url: "https://github.com/StellarRequiem/mcp-assure", role: "deny-by-default MCP tool gate" },
    { name: "agent-control", url: "https://github.com/StellarRequiem/agent-control", role: "local assured host" },
    { name: "browser-leash", url: "https://github.com/StellarRequiem/browser-leash", role: "browser session plane" },
    { name: "desktop-leash", url: "https://github.com/StellarRequiem/desktop-leash", role: "desktop session plane" },
    { name: "agent-soc", url: "https://github.com/StellarRequiem/agent-soc", role: "agent-plane receipt monitor" },
    { name: "portfolio", url: "https://github.com/StellarRequiem/portfolio", role: "source for this site" }
  ];
  var PAPERS = [
    { title: "Authority Is Not Ambient", url: "/papers/mediated-control-plane/" }
  ];

  var ctx = document.modelContext;
  var apiPresent = !!(ctx && typeof ctx.registerTool === "function");
  var errors = [];
  var registration = {
    api_present: apiPresent,
    state: apiPresent ? "idle" : "unsupported",
    expected: 0,
    pending: 0,
    registered: 0,
    failed: 0
  };

  function onCeilingPage() {
    return location.pathname === "/ceiling" || location.pathname.indexOf("/ceiling/") === 0;
  }

  function declaredNames() {
    return onCeilingPage() ? SITE_TOOLS.concat(CEILING_TOOLS) : SITE_TOOLS.slice();
  }

  function registrationSnapshot() {
    return {
      api_present: registration.api_present,
      state: registration.state,
      expected: registration.expected,
      pending: registration.pending,
      registered: registration.registered,
      failed: registration.failed
    };
  }

  function updateRegistrationState() {
    if (!apiPresent) registration.state = "unsupported";
    else if (registration.pending > 0) registration.state = "pending";
    else if (registration.failed === 0 && registration.registered === registration.expected) registration.state = "ready";
    else if (registration.registered > 0) registration.state = "partial";
    else if (registration.expected > 0) registration.state = "failed";
    else registration.state = "idle";
    window.dispatchEvent(new CustomEvent("xcl:webmcp-registration", { detail: registrationSnapshot() }));
  }

  function register(tool) {
    if (!apiPresent) return Promise.resolve({ ok: false, reason: "WEBMCP_UNAVAILABLE", tool: tool.name });
    registration.expected += 1;
    registration.pending += 1;
    updateRegistrationState();

    var promise;
    try {
      promise = Promise.resolve(ctx.registerTool(tool));
    } catch (error) {
      promise = Promise.reject(error);
    }

    return promise.then(function () {
      registration.pending -= 1;
      registration.registered += 1;
      updateRegistrationState();
      return { ok: true, tool: tool.name };
    }).catch(function (error) {
      registration.pending -= 1;
      registration.failed += 1;
      errors.push({
        tool: tool.name,
        message: String(error && error.message ? error.message : error)
      });
      updateRegistrationState();
      return { ok: false, reason: "REGISTRATION_FAILED", tool: tool.name };
    });
  }

  function ceiling() {
    return {
      site: "xclusivexo.com",
      page: location.pathname,
      claim: "This document exposes an explicit WebMCP allowlist. Authority is not ambient.",
      declared: declaredNames(),
      registration: registrationSnapshot(),
      refused: REFUSED.slice(),
      writes: onCeilingPage()
        ? "propose_change queues a synthetic release-policy diff; apply_change and reject_change require a one-use content-bound page-activation arm"
        : "no mutating WebMCP tools are declared by this script on this page"
    };
  }

  function ok(data) {
    return { ok: true, origin: location.origin, data: data };
  }

  function exactEmptyObject(input) {
    try {
      if (!input || Object.prototype.toString.call(input) !== "[object Object]") return false;
      var proto = Object.getPrototypeOf(input);
      var plain = proto === null || (Object.prototype.hasOwnProperty.call(proto, "constructor")
        && typeof proto.constructor === "function" && proto.constructor.name === "Object");
      return plain && Reflect.ownKeys(input).length === 0;
    } catch (error) {
      return false;
    }
  }

  function boundedReadResult(result) {
    var length;
    try {
      length = Array.from(JSON.stringify(result)).length;
    } catch (error) {
      length = Infinity;
    }
    return length <= TOOL_OUTPUT_MAX
      ? result
      : { ok: false, reason: "OUTPUT_LIMIT_EXCEEDED", limit: TOOL_OUTPUT_MAX, observed: length };
  }

  function wrap(fn) {
    return async function (input, options) {
      var normalized = typeof input === "undefined" ? {} : input;
      var signal = options && options.signal;
      if (!exactEmptyObject(normalized)) {
        return { ok: false, reason: "INVALID_INPUT" };
      }
      if (signal && signal.aborted) {
        return { ok: false, reason: "ABORTED" };
      }
      var result = await fn(normalized, signal);
      if (signal && signal.aborted) return { ok: false, reason: "ABORTED" };
      return boundedReadResult(result);
    };
  }

  var api = {
    apiPresent: apiPresent,
    errors: errors,
    siteTools: SITE_TOOLS.slice(),
    ceilingTools: CEILING_TOOLS.slice(),
    ceiling: ceiling,
    onCeilingPage: onCeilingPage,
    register: register,
    registration: registrationSnapshot
  };
  Object.defineProperty(api, "available", {
    enumerable: true,
    get: function () { return registration.state === "ready"; }
  });
  window.XclWebMCP = api;

  if (!apiPresent) return;

  var empty = { type: "object", additionalProperties: false, properties: {} };
  [
    {
      name: "list_claim_ceiling",
      title: "Claim ceiling",
      description: "Return the WebMCP actions declared and refused on this page. Read-only and non-authorizing.",
      inputSchema: empty,
      annotations: READ_ONLY_UNTRUSTED,
      execute: wrap(function () { return ok(ceiling()); })
    },
    {
      name: "list_public_work",
      title: "Public work",
      description: "Return a fixed list of public project links stated by this site. Read-only; does not navigate.",
      inputSchema: empty,
      annotations: READ_ONLY_TRUSTED,
      execute: wrap(function () { return ok(WORK); })
    },
    {
      name: "list_papers",
      title: "Papers",
      description: "Return a fixed list of working-paper paths published by this site. Read-only; does not navigate.",
      inputSchema: empty,
      annotations: READ_ONLY_TRUSTED,
      execute: wrap(function () { return ok(PAPERS); })
    },
    {
      name: "get_capability_statement",
      title: "Capability statement",
      description: "Return the public capability-statement URL. Read-only; does not open the URL or contact anyone.",
      inputSchema: empty,
      annotations: READ_ONLY_TRUSTED,
      execute: wrap(function () {
        return ok({ url: location.origin + "/capability-statement.html" });
      })
    }
  ].forEach(register);
})();
