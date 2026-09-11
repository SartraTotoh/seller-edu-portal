# Seller Education Team Hub v8.1.0 — Zero-Tolerance Release Gate

Release policy: PASS = every required check passes. Any single FAIL blocks release. There is no partial-pass production status.

## Architecture invariants
1. Portal login is independent from Workspace Connector registration.
2. One identity flow only. No iframe/popup fallback chain that can accidentally enter legacy Connector routes.
3. Role is resolved from an approved server-side Seller Edu OS role source; users cannot self-select or escalate role.
4. Member receives member scope only.
5. Team Lead receives permitted team scope only.
6. Manager receives manager scope and may switch UI perspective to Member/Team Lead/Manager without changing real identity.
7. X is server-gated Manager-only. Hiding UI is not authorization.
8. X Scenario is read-only and cannot mutate task ownership.
9. Keep to backup is immutable.
10. Existing business data is never reset by authentication/session changes.
11. Existing Connector and Gateway Script/Deployment IDs must not be replaced silently.
12. SeaTalk remains isolated from login and stays API_PENDING until an approved inbound API/secret exists.
13. No employee roster, privileged role list, token, secret or password is committed to public Hosting/GitHub.

## Login gate
- Approved internal Manager login -> PASS.
- Approved internal Team Lead login -> PASS.
- Approved internal Member login -> PASS.
- Approved external-domain Team Lead account -> explicit supported result, not accidental Google Drive/404 route.
- Unregistered email -> ACCESS_DENIED with user-readable message.
- Session reset -> old session invalid; fresh login succeeds.
- Refresh -> authenticated state is stable.
- No GATEWAY_RESPONSE_INVALID in login path.
- No ACTIVE_TEAM_MEMBER_REQUIRED in portal identity path.
- No Google Drive 'unable to open file' login route.
- No CSP frame-src violation required for authentication.

## Interface gate
- Member: only member-allowed modules/data.
- Team Lead: permitted team summary + member functions.
- Manager: all-team summary + X + perspective switcher.
- Perspective switch never changes authenticated identity.
- X nav absent for non-manager DOM/data response.
- Direct X endpoint request by non-manager -> 403/X_ACCESS_DENIED.

## X data gate
- Task facts come from verified source only.
- Journey facts show source/confidence.
- Daily/Weekly/Monthly/Quarterly filters all work.
- Quantity metrics show total + average.
- Zero periods remain in denominator.
- Partial current period is labeled PARTIAL.
- Duration metrics are per-task, not divided by calendar grain.
- Average + median shown where supported.
- Effort, elapsed, waiting and aging are separate.
- Impact score exposes its breakdown.
- Priority, Impact and Value remain separate fields.
- No employee leaderboard/raw message/presence ranking.

## Connector/Gateway gate
- Connector UI opens under corporate domain access.
- Connector registration path works for active approved users.
- Connector -> Gateway response is valid JSON.
- Gateway -> master spreadsheet read succeeds.
- Existing visitor registry survives unchanged.
- Existing task/content/work records survive unchanged.
- No duplicate Apps Script project/deployment creation.
- No broadening to ANYONE.
- Connector remains USER_ACCESSING.
- Gateway remains USER_DEPLOYING.

## Frontend/security gate
- No authentication dependency on CSP-blocked iframe.
- No inline script/style requirement that violates production CSP.
- No secrets/tokens/passwords/employee roster committed to public Hosting/GitHub.
- Role and X data are not embedded as privileged data in public static assets.
- Direct route refresh works.
- Notebook responsive navigation fits all allowed modules.
- English-first + Thai support does not alter data values.
- DD-MM-YYYY display rule passes.

## Deployment gate
- Exact Firebase project and Hosting site verified before deploy.
- Pre-deploy backup created.
- Static syntax checks pass.
- Apps Script source conflict check passes (.js/.gs basename collision = BLOCK).
- Existing deployment ID verification passes before Hosting deploy.
- Firebase deploy succeeds.
- Public readback succeeds.
- Browser acceptance succeeds for all required roles.

## Final rule
Production Completed may be declared only when every item above is PASS. A single unresolved item means BLOCKED/NOT COMPLETE.
