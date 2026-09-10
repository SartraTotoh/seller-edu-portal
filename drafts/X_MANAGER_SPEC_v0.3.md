# X — Manager Work Intelligence v0.3

Status: DRAFT ONLY — do not deploy to production from this branch.

## Purpose
X is a manager-only work intelligence module for Seller Education Team Hub. It explains work value, task journey, effort, elapsed time, waiting time, handoffs, rework, dependencies and outcomes without turning task volume into an employee leaderboard.

## Visibility
- Manager-only capability.
- Pilot access is restricted to the approved manager account during the isolated test phase.
- Final implementation must enforce access server-side. Hiding the menu with CSS is not sufficient.
- Non-authorized users must not receive the X dataset.

## Primary views
1. Executive Signal — active work, high-impact exposure, dependency pressure, value delivered and management attention.
2. Value Map — impact × effort matrix.
3. X Scenario — continuity simulation only; never automatically reassigns work.
4. Task Portfolio — task, owner/team, journey, impact, value, effort, dependencies and health.
5. Work Journey — stage-level and action-level timeline showing who did what, how much effort was used, elapsed time, waiting time, handoffs and rework.
6. Value Evidence — expected value → delivered value → proven outcome with evidence and data confidence.

## Global filters
- Grain: Daily / Weekly / Monthly / Quarterly.
- Date range: DD-MM-YYYY to DD-MM-YYYY.
- Team.
- Owner.
- Impact.
- Work type.
- Status.
- Search.

## Quantity aggregation
Every quantity metric must expose both Total and Average for the selected grain.

Examples:
- Tasks created: total + tasks/day|week|month|quarter.
- Tasks completed: total + tasks/day|week|month|quarter.
- Effort hours: total + hours/day|week|month|quarter.
- Handoffs: total + handoffs/day|week|month|quarter.
- Rework: total + rework/day|week|month|quarter.
- Value delivered: total + value items/day|week|month|quarter.

Average = total result ÷ number of periods in the selected date range. Periods with zero must remain in the denominator.

Current incomplete periods must be marked PARTIAL and compared against matched elapsed periods rather than a full prior period.

## Duration metrics
Duration metrics are not divided by calendar grain. They are calculated per work item and should show average plus median when enough data exists.

- Cycle time = completed-at − started-at.
- Stage elapsed = stage-end − stage-start.
- Waiting time = elapsed time explicitly classified as waiting/blocking/dependency time.
- Stage aging = now − stage-start for an unfinished stage.
- Waiting ratio = waiting time ÷ stage/task elapsed time.

## Work Journey detail
Each task can use a journey template appropriate to its work type. Steps that do not apply are N/A rather than fabricated.

Suggested templates:
- Training: Scope → Design → Material → Review → Schedule → Deliver → Evidence.
- Content / Creative: Brief → Create → Review → Revise → Approve → Publish → Measure.
- Project / Campaign: Scope → Plan → Coordinate → Execute → Validate → Launch → Close.
- Data / Insights: Request → Collect → Clean → Analyze → Validate → Present → Action.
- Operations / Support: Request → Diagnose → Coordinate → Resolve → Confirm → Close.
- System / Automation: Requirement → Design → Build → Test → Deploy → Monitor → Handover.

Each journey event should support:
- Task ID.
- Stage.
- Actor.
- Actor role.
- Team.
- Action.
- Started at.
- Completed at.
- Effort.
- Wait reason.
- Handoff from/to.
- Revision/rework.
- Dependency.
- Evidence.
- Source.
- Data confidence: Verified / User reported / Derived / Missing.

## Impact model
Priority, Impact and Value are separate concepts.

Impact draft weighting:
- Business / Seller impact: 35%.
- Reach: 25%.
- Dependency / critical path: 25%.
- Time sensitivity: 15%.

The score must always expose its breakdown. It is a score of the work item, never a performance rating of the owner.

## Value taxonomy
A task may have more than one value type:
- Seller Impact.
- Business Impact.
- Learning & Capability.
- Operational Efficiency.
- Risk Prevention.
- Quality & Compliance.
- Strategic Enablement.

Value state:
Expected → In Delivery → Delivered → Proven.

## X Scenario
X Scenario is a read-only continuity simulation. Selecting a team member should calculate:
- work potentially affected;
- high-impact exposure;
- critical dependencies;
- tasks needing backup review;
- tasks that can safely wait;
- available alternative coverage when supported by verified data.

The simulation must never change a task owner unless the manager explicitly exits the simulation and performs a normal governed task action.

## Interpretation guardrails
- No employee leaderboard.
- No raw message-volume ranking.
- No online-presence scoring.
- Do not interpret high task count as high performance.
- Separate active effort from elapsed/waiting time so delay is not automatically attributed to the task owner.
- If historical data is insufficient for a benchmark, show “Not enough verified history” rather than inventing a normal range.

## Draft UI direction
Use the existing Seller Education Team Hub visual system: top navigation, corporate liquid-glass surfaces, restrained Shopee orange, navy hierarchy, and Passport typography baseline.

## Production sequence
1. Freeze baseline and preserve the Keep to backup folder as immutable.
2. Reset active portal sessions without deleting business data or connector registrations.
3. Enter isolated X pilot mode for the approved manager account.
4. Build server-gated X data endpoint and UI.
5. Validate real task, journey, effort and period aggregation.
6. Re-open portal access and update connectors in-place; reconnect only identities that actually require renewed authorization.

No production completion claim is valid until browser acceptance and server-side access checks pass.