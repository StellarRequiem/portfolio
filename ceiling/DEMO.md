# Ceiling demo plan (target 2 minutes 30 seconds)

Record the deployed page in a browser that visibly reports WebMCP ready. Never
substitute a mocked registration state.

1. **0:00-0:15 - The boundary.** An agent can help change a synthetic release
   policy without inheriting deployment authority. Show `WEBMCP READY 11/11`
   and state: seven Ceiling workflow tools plus four shared read tools.
2. **0:15-0:32 - Discover.** Have the agent call `list_claim_ceiling`, then
   `get_workspace`. Show the five typed fields and five refused capability
   classes.
3. **0:32-0:52 - Hard denial.** Ask the agent to disable signed artifacts. Show
   `POLICY_DENIED · SIGNED_ARTIFACTS_REQUIRED`, zero pending items, unchanged
   policy, and the verified receipt.
4. **0:52-1:15 - Useful but powerless.** Ask for a rollback-window change from
   30 to 45 minutes, then call `apply_change` without arming. Show the semantic
   diff, `USER_ACTIVATION_REQUIRED`, and unchanged policy.
5. **1:15-1:43 - Exact authority.** A person clicks **Arm apply for agent**.
   Repeat the exact `apply_change` call once, then replay it. Show one applied
   change, the consumed arm, and replay refusal.
6. **1:43-1:55 - Recovery.** Click the page-only **Rollback change** action.
   Show the value return to 30 while applied and rollback history remains.
7. **1:55-2:13 - Evidence at a glance.** Show the already-completed 7/7 Defense
   Matrix, 50/50 scalar-policy adapter summary, and verified receipt count.
   Do not run or narrate every case individually.
8. **2:13-2:30 - Honest ceiling.** State that the policy is synthetic and
   session-local; there is no deployment, OS, filesystem, credential, payment,
   messaging, account, or cross-origin authority. Receipts are unsigned.

Add captions. Keep the registration chip, tool output, semantic diff, and
receipt status readable. If the browser reports unsupported or partial
registration, stop and fix the environment rather than narrating success.
