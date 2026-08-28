# Ceiling threat model

Status: implemented local demonstration boundary, not a production security
control or deployed WebMCP conformance claim.

## Protected assets

- integrity of the synthetic release policy;
- integrity and isolation of values managed by any admitted scalar adapter;
- exact correspondence between a proposal, approval, and state transition;
- order and content of retained action receipts;
- clarity about which tools are available and whether registration succeeded;
- the user's ability to refuse, recover, inspect, and export evidence.

## Trust boundaries

1. **Agent to WebMCP contract.** Agent input is untrusted. Only eleven named
   tools are declared: four shared read-only tools and seven workbench tools.
   Schemas and runtime validation both enforce exact inputs.
2. **Proposal to policy admission.** A proposal cannot mutate policy. The
   deterministic evaluator derives risk and blocks hard invariant violations
   before an approval can be created.
3. **Page activation to effect.** Apply and reject require a browser-trusted
   event and transient user activation. The resulting 15-second arm is bound
   to the exact id, request, baseline, content digest, and operation, and is
   consumed once.
4. **Effect to evidence.** State changes are serialized with receipt append.
   Each receipt binds complete input and result digests to sequence, prior
   hash, outcome, reason, and timestamp.
5. **Recovery.** Rollback is not exposed through WebMCP. The closure-private
   live workbench can be rolled back only from its visible page button after a
   trusted activation creates an exact rollback-specific one-use arm, and only
   when the latest field value still matches the applied change's expected
   baseline.
6. **Adapter to host effect.** The portable engine validates and commits
   session-local desired state. A host integration must separately authorize,
   execute, verify, and recover any external side effect; this release does
   not perform one.

## Considered threats and controls

| Threat | Implemented control | Residual risk |
|---|---|---|
| Agent invents fields or smuggles extra input | Closed schemas plus exact runtime object checks | Browser or host compromise is outside the page boundary |
| Agent bloats context through tool metadata or output | Adapter copy bounds plus deterministic 30/500/150 metadata checks and a 1,500-character result ceiling | The recommendation may evolve and other host surfaces need their own bounds |
| Agent proposes a forbidden value | Hard policy denial before proposal admission | The demonstration policy is intentionally small and synthetic |
| Retry creates duplicate changes | Request id bound to canonical payload digest | Idempotency state resets on reload and is capped per session |
| Approval is reused for another action | Operation- and content-bound one-use arm | Activation is not identity attestation |
| Delayed action overwrites newer state | Baseline comparison and revision check before commit | No distributed or server-side concurrency model is claimed |
| Parallel calls double-apply | Serialized transactions and single arm consumption | Service-worker, extension, and browser-compromise threats are out of scope |
| Receipt data is edited or reordered | Full chain recomputation detects mutation, deletion, reorder, and linkage errors | An attacker able to replace all page code and evidence can forge a new unsigned chain |
| Receipt budget blocks emergency actions | Reserved final receipt slots for page-activated or already-authorized actions | Session memory remains finite |
| Script dispatches a synthetic click | `event.isTrusted` and transient user-activation checks | Operating-system automation is not detectable or ruled out |
| Registration partially fails | Visible unsupported, pending, partial, failed, and ready states | Positive conformance still requires a supported browser test |
| Deployment disables or widens the browser boundary | Release gate requires HTTPS, origin isolation, same-origin `tools` policy, and no cross-origin delegation | Source tests cannot prove live response headers or hosting identity |
| Unsafe recovery overwrites newer work | Apply and rollback require the exact monotonic policy version; matching values cannot revive obsolete authority | Recovery is session-local and not a deployment rollback |
| Malformed or stateful adapter weakens the contract | Exact field closure, cloned definitions, schema generation, and fail-closed evaluator handling | Host-supplied policy remains trusted application code and requires its own review |
| Host treats an admitted desired state as completed external work | The adapter contract explicitly returns session-local state only | Real side-effect authorization, execution, and reconciliation remain host responsibilities |

## Deliberate non-capabilities

Ceiling has no credential, account, payment, messaging, social-posting,
filesystem, operating-system, cross-origin, deployment, or external network
tool. It has no persistent database or background service. The downloadable
evidence bundle is initiated by the user, not by an agent tool.

## Security invariants

- A proposal never applies itself.
- A hard policy denial never creates a pending change.
- The same idempotency key cannot name two payloads.
- No agent apply or reject succeeds without an exact live arm.
- One operation-specific arm admits at most one matching apply, reject, or
  rollback state transition.
- A stale baseline cannot overwrite newer policy, including cross-field context
  drift and value-away/value-back (ABA) histories.
- Rollback cannot erase history or revert through a newer dependent value.
- Receipt verification must fail after retained-row mutation, deletion,
  reorder, or linkage corruption.
- Missing or rejected WebMCP registration is never reported as ready.

## Validation evidence

`npm run verify` runs 78 focused tests, a 23-case release-policy evaluation, a
50-case universal-adapter conformance matrix, and the pinned inherited race
reproduction. The current local browser pass additionally checks refusal,
proposal-only behavior, synthetic activation failure, the seven-case Defense
Matrix, responsive layout, and console errors. These are local results;
deployment, host-side effects, live-agent evaluation, independent review, and
positive WebMCP browser conformance remain separate release gates.
