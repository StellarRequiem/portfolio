# Local evidence

Status: local deterministic and local-browser evidence only. Deployed WebMCP
conformance and live-agent evaluation remain pending.

## Inherited defect reproduction

```bash
node tests/inherited-receipt-race.cjs
```

Observed on 2026-08-26:

```text
receipt_count 17
unique_sequence_count 1
duplicate_sequence_count 16
reported_chain "ok"
reproduced true
```

The inherited prototype let concurrent appends read the same sequence and
prior hash, then reported that broken structure as healthy.

## Current verification

```bash
npm run verify
```

Current focused suite: **78 tests, 78 passing, 0 failing**. It covers:

- exact combined registration of four shared and seven workbench tools;
- strict schemas and runtime validation for five typed policy fields;
- hard denial of unsigned artifacts and excess release parallelism;
- derived low, medium, high, and critical risk outcomes;
- same-payload idempotent replay and changed-payload conflict;
- unarmed, wrong-operation, expired, replayed, concurrent, and stale effects;
- monotonic policy-context binding across cross-field and ABA histories;
- human-only compatible rollback and obsolete historical rollback refusal;
- operation-specific trusted activation and synthetic-click refusal;
- serialized receipt append and complete input/result binding;
- receipt mutation, deletion, reorder, and extra-field detection;
- receipt limits, emergency reserve, cancellation, and abort handling;
- seven isolated Defense Matrix probes;
- registration failure visibility, responsive hooks, contrast, and public-copy
  claim checks.
- generated adapter schemas, exact field closure, malformed-adapter refusal,
  evaluator failure, invalid generated ids, and adapter-definition isolation;
- WebMCP metadata/output budgets, hidden and symbol input properties, and
  source/deployment compatibility gates;
- malformed injected wall, ISO, and monotonic clock return values before
  arm creation or state commit;
- hard denials, one-use authority, safe retry, parallel apply, stale baseline,
  rollback, and cross-instance isolation across three unrelated synthetic
  domains.
- 3,600 deterministic state-machine turns mixing proposals, unarmed attempts,
  apply, reject, rollback, concurrency, time movement, and invariant checks.

The same command also runs the inherited-race reproduction and the standalone
deterministic evaluation.

## Coverage floor

```bash
npm run coverage
```

The deep release gate requires at least 90% line, 80% branch, and 85% function
coverage across the directly instrumented CommonJS core. Page scripts loaded
through the isolated browser fixture are behavior-tested but are not included
in Node's native percentage table. Exact results are in
`evaluation/COVERAGE.md`.

## Deterministic evaluation

```bash
npm run eval
```

Observed: **23/23 passing**.

| Category | Result |
|---|---:|
| Policy | 5/5 |
| Validation | 5/5 |
| Retry safety | 2/2 |
| Authority | 6/6 |
| Recovery | 2/2 |
| Evidence | 3/3 |

This is a local component evaluation, not a live-agent or browser WebMCP
conformance result. Full results and the claim boundary are in
`evaluation/RESULTS.md`.

## Universal adapter conformance

```bash
npm run eval:universal
```

Observed: **50/50 passing**.

| Category | Result |
|---|---:|
| Adapter definition | 4/4 |
| Policy | 8/8 |
| Authority | 9/9 |
| Concurrency | 3/3 |
| Recovery | 3/3 |
| Retry safety | 6/6 |
| Isolation | 3/3 |
| Validation | 14/14 |

The matrix uses content-publishing, access-control, and spending-policy
adapters. It tests the local scalar change contract, not arbitrary business
logic, host-side effects, deployment, or positive browser conformance. Full
results are in `evaluation/UNIVERSAL-RESULTS.md`.

## Repeat verification

```bash
npm run verify:repeat
```

Observed: **10/10 complete runs passing** with `unchanged_closure: true`.
Every run required 78/78 focused tests, 23/23 release-policy evaluations,
50/50 universal-adapter cases, the inherited comparison reproduction, both
exact manifest checks, and exit zero.
See `evaluation/REPEATABILITY.md` for the claim boundary.

## Local browser interaction

The current closure was exercised at `http://127.0.0.1:8767/ceiling/` in the
Codex in-app browser on 2026-08-26. Observed:

- hard-policy denial returned `SIGNED_ARTIFACTS_REQUIRED`, queued no change,
  and produced one verified receipt;
- the safe example queued a `rollback_window_minutes` diff from 30 to 45 and
  left the policy unchanged;
- an unapproved apply left one proposal pending, applied nothing, and produced
  a verified refusal receipt;
- an automation-dispatched confirmation did not satisfy the transient
  activation boundary and produced no effect;
- the Defense Matrix completed 7/7 probes successfully;
- a 390 x 844 viewport had no horizontal overflow and kept the next section
  visible below the first-viewport content;
- the browser console produced no warning or error entries during the pass.

That browser reported WebMCP unsupported. This historical run establishes only
the inspector fallback and negative activation boundary.

## Local supported-browser WebMCP interaction

On 2026-08-28, the cache-clean current closure was loaded at
`http://127.0.0.1:8768/ceiling/` in the Codex in-app browser. The browser
reported `WEBMCP READY 11/11` and exposed the exact reviewed tool schemas.
Direct WebMCP calls then established:

- 11/11 tool discovery with zero registration failures;
- the signed-artifact hard denial, with no queued or applied change;
- one admitted rollback-window proposal with the policy still unchanged;
- `USER_ACTIVATION_REQUIRED` for an unarmed apply;
- 7/7 isolated boundary probes through `run_boundary_probe`; and
- a verified 3/3 shared receipt chain with unchanged policy and zero applied
  changes.

Automation-driven clicks did not satisfy the combined trusted-event and
transient user-activation boundary. The exact source identities, observations,
receipt tip, and unproven boundaries are retained in
`evaluation/LIVE-WEBMCP-LOCAL-RESULT.md`.

This is positive local WebMCP discovery and tool-execution evidence. It is not
deployed-origin conformance, human-authorized positive activation, or the
30-prompt live-agent evaluation.

## Dated WebMCP source review

On 2026-08-26, the implementation was checked against the current WebMCP draft
and Chrome's overview, imperative API, security, and evaluation guidance. The
source uses `document.modelContext.registerTool()`, Promise-aware registration,
closed schemas, cancellation signals, current annotations, exact runtime input
checks, and tested metadata/output character budgets. The review is recorded
in `evaluation/WEBMCP-COMPATIBILITY.md`.

This is source compatibility evidence only. Origin isolation, the live `tools`
Permissions Policy, origin-trial activation, deployment identity, and positive
tool discovery/execution still require the final hosted browser run.

## Still required

- independent non-author review against that exact closure;
- public deployment identity and rollback evidence;
- deployed-origin WebMCP conformance and human-authorized positive activation;
- the 30-prompt live-agent evaluation or an explicit statement that it was not
  completed before submission.
