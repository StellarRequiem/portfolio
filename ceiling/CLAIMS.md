# Ceiling claim ledger

Anything not listed as confirmed remains a candidate.

## Confirmed in this source tree

- `webmcp.js` declares four shared page-level read-only tools and reports API
  absence, pending registration, success, partial failure, or failure without
  treating API presence as successful registration.
- `/ceiling/` declares seven additional tools: `get_workspace`, `get_receipts`,
  `propose_change`, `apply_change`, `reject_change`,
  `list_boundary_probes`, and `run_boundary_probe`.
- Exact input schemas reject unknown properties, wrong types, empty values,
  malformed request ids, and overlong rationale content.
- Caller-proposed rationale returned by `get_workspace` is marked with
  `untrustedContentHint: true`.
- The workbench models five typed fields in one in-memory synthetic release
  policy. It derives risk and refuses unsigned artifacts or a parallel-release
  value above four before an approval can exist.
- The release policy is a thin adapter over a shared scalar change
  engine. Adapter field definitions generate the same closed proposal and
  decision schemas used by runtime validation.
- Proposal retries carry payload-bound idempotency keys. Same-key same-payload
  retries return the original proposal; same-key changed-payload retries fail.
- Apply and reject fail closed unless a browser-trusted page activation has
  armed the exact pending id, request, baseline, content, creation time, and
  operation. An admitted change also fails if its monotonic policy context
  became stale, even when values later return to their original bytes.
- The arm expires after 15 seconds, is operation-specific, and is consumed
  once. Concurrent apply attempts cannot both succeed.
- Receipt appends are serialized. Each receipt binds the complete input and
  complete result digests, sequence, timestamp, prior hash, outcome, and
  reason using stable sorted-key JSON and SHA-256.
- Verification recomputes the complete chain and detects mutation, deletion,
  reorder, extra fields, broken sequence, and broken prior-hash linkage.
- The page visibly distinguishes WebMCP registration state from local
  inspector functionality.
- A user can export the current state, verification summary, and complete
  receipt chain as a local JSON evidence bundle.
- Read-only WebMCP calls do not append receipts or consume the mutation receipt
  budget. The final 20 of 100 receipt slots are reserved for page-activated or
  successfully armed actions.
- The seven-case Defense Matrix runs isolated deterministic attacks against
  the implemented authority and receipt core without changing the shared task or
  consuming its receipt budget.
- Rollback is not registered as a WebMCP tool. The live workbench is
  closure-private, and its visible rollback action requires a trusted browser
  event plus transient user activation to create an exact rollback-specific
  one-use arm before reverting the latest compatible applied value without
  deleting history.
- The automated local suite passes 78 tests. A release-policy evaluation
  passes 23/23 cases, and a separate universal-adapter matrix passes 50/50
  local deterministic cases across content publishing, access control, and
  spending policy. The inherited race fixture separately reproduces the
  defect that motivated the replacement core.

## Explicitly not claimed

- No ambient agent, browser, account, or operating-system authority.
- No filesystem, credential, payment, email, social-posting, or network tool.
- No cross-origin tool exposure.
- No persistent database or server-side mutation.
- No real deployment or release-policy integration; the policy is synthetic
  and resets on reload.
- The adapter matrix establishes the documented scalar change contract only.
  It does not establish arbitrary workflow compatibility, host-side effect
  enforcement, deployment safety, or universal browser conformance.
- The downloadable bundle is user-initiated; no agent tool writes to disk.
- No signed, externally anchored, or persistent receipt log.
- No guarantee that a probabilistic model will behave safely.
- A trusted browser activation is not proof of human identity and does not
  rule out operating-system-level automation.
- No claim of OpenAI authorship, sponsorship, endorsement, or product status.
- No live deployment or WebMCP browser-conformance result until separately
  tested against the deployed origin.

## Pending external gates

- Fresh independent review of the final submission closure.
- Live browser registration and execution evidence.
- Public repository creation and dated commit history.
- Deployment to the public origin.
- Public demo video and Devpost submission.
