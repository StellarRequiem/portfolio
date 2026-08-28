# Universal adapter contract

Status: implemented and locally conformance-tested for bounded scalar changes
inside one JavaScript context.

Ceiling separates the invariant control engine from domain policy. The engine
owns exact validation, payload-bound retry, proposal state, one-use authority,
serialized decisions, monotonic policy-context binding, stale-baseline
refusal, rollback, and snapshots. An
adapter owns field definitions, initial values, and one synchronous policy
evaluator.

## Minimal adapter

Load `core.js` before `universal-control.js`, then define a domain:

```js
const adapter = CeilingUniversalControl.defineAdapter({
  scenario: "content_publication",
  idPrefix: "pub-",
  fieldOrder: ["visibility", "review_required"],
  fieldDefinitions: {
    visibility: {
      label: "Visibility",
      type: "string",
      enum: ["internal", "public"],
      description: "Audience allowed to view the content."
    },
    review_required: {
      label: "Require review",
      type: "boolean",
      description: "Hard publication invariant."
    }
  },
  initialValues: {
    visibility: "internal",
    review_required: true
  },
  assessChange({ field, proposedValue }) {
    if (field === "review_required" && proposedValue === false) {
      return {
        allowed: false,
        code: "REVIEW_REQUIRED",
        risk: "critical",
        reasons: ["Publication cannot bypass review."]
      };
    }
    return {
      allowed: true,
      code: "POLICY_PASS",
      risk: field === "visibility" && proposedValue === "public" ? "high" : "low",
      reasons: ["The publication policy admits this value."]
    };
  }
});

const workbench = adapter.createWorkbench({ crypto: window.crypto });
const schemas = adapter.inputSchemas();
```

`schemas.proposal` and `schemas.decision` are generated from the same closed
field catalog and limits used by runtime validation. A host can register those
schemas with WebMCP without maintaining a second handwritten contract.

## Adapter requirements

- `scenario`: lowercase ASCII identifier.
- top-level adapter keys are exact; unknown options are rejected;
- `fieldOrder`: unique lowercase ASCII field identifiers.
- `fieldDefinitions`: exact same keys as `fieldOrder` and `initialValues`.
- field labels are limited to 80 code points and schema-facing descriptions to
  150 code points;
- supported scalar types: `boolean`, `integer`, finite `number`, and `string`;
- strings must declare an enum of at most 256 unique values or a finite
  code-point `maxLength` bound;
- integers must use safe-integer minimum and maximum bounds; finite numbers
  must declare finite minimum and maximum bounds;
- `assessChange`: synchronous, pure policy function returning `allowed`, an
  uppercase code, `low|medium|high|critical` risk, and one to eight dense
  reasons. The four result keys are exact.

Every initial field is assessed as a no-op during adapter construction. A
malformed evaluator or a policy-denied initial value rejects the adapter.

Every proposal records the current monotonic `policy_version`. Any applied or
rolled-back policy change advances that version. Apply and rollback require
the exact version they were assessed against, so an old action cannot become
valid again merely because values changed away and later returned (the ABA
case), and a policy decision cannot silently survive a change to another field.

Malformed adapters, initial values, policy results, generated ids, proposal
objects, field values, and request ids fail closed.

Injected wall, ISO, and monotonic clock capabilities are validated when used.
Malformed return values fail before a prepared state transition can commit.

## Host integration responsibilities

The engine does not make an external side effect. It changes its own
session-local desired state. A real host must separately provide:

1. browser-trusted activation or a stronger identity/authorization ceremony;
2. a receipt recorder around `preparePropose`, `prepareApply`,
   `prepareReject`, and `prepareRollback` before committing their returned
   transactions;
3. persistent state, transaction/outbox semantics, and conflict handling;
4. the actual domain executor and its independent authorization;
5. durable or signed evidence if session-local SHA-256 receipts are
   insufficient; and
6. supported-browser and agent-client conformance testing.

When the adapter is exposed as an agent tool, the host must also bound tool
metadata and output. The Ceiling page keeps full state and evidence local but
returns compact WebMCP summaries with a hard 1,500-character ceiling.

Do not invoke a remote mutation inside `assessChange`. Do not reinterpret a
successful in-memory apply as proof that an external system changed.

## Conformance

```bash
npm run eval:universal
```

The current matrix runs 50 deterministic cases across content publishing,
access control, and spending policy. It covers adapter closure, hard denials,
no ambient effects, unarmed and wrong-operation attempts, parallel apply,
rollback, stale baselines, prototype-like request ids, changed-payload retry,
instance isolation, field-bound schema parity, unsafe initial policy, sparse
evaluator output, malformed objects, runtime capability checks, safe integers,
direct-assessment validation, evaluator failure, and generated-id failure. The
focused test suite also runs 3,600 deterministic mixed-operation stress turns
across four independent seeds per adapter.

See `evaluation/UNIVERSAL-RESULTS.md` for the result and claim boundary.
