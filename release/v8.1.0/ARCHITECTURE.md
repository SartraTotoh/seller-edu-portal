# Seller Education Team Hub v8.1.0 — Clean Architecture

## Non-negotiable rule
Portal authentication MUST NOT depend on Workspace Connector health.

A user must be able to authenticate, resolve a Seller Edu OS role, and enter the permitted interface even when Gmail/Calendar/SeaTalk/Connector integrations are unavailable.

## Request flow

```text
selleredu-portal.web.app
        |
        v
Google identity provider
        |
        v
verified email
        |
        v
server-side Seller Edu OS role resolver
        |
        +--> Member interface
        +--> Team Lead interface
        +--> Manager interface
                 |
                 +--> X (manager authorization required)

After portal entry only:
        |
        +--> Workspace Connector health / connect / reconnect
        +--> Gateway governed data
        +--> external work-signal adapters
```

## Separation of responsibilities

### Identity layer
- Determines the signed-in Google identity.
- Never calls Connector registration routes.
- Never requires TEAM_MASTER Connector registration to authenticate the Portal.
- Produces an identity result only.

### Role layer
- Uses an approved server-side Seller Edu OS role source.
- No employee roster or privileged role dataset is published in static Hosting or a public repository.
- Business title is metadata and never overrides Seller Edu OS role.
- Exact supported interface roles: Member, Team Lead, Manager.

### Interface layer
- Member sees own-scope work.
- Team Lead sees permitted team scope.
- Manager sees management scope and can switch perspective to Member / Team Lead / Manager without changing the real signed-in identity.

### X layer
- Available only in Manager perspective to an identity whose authoritative Seller Edu OS role is Manager.
- UI hiding is not authorization.
- X data endpoints must reject non-manager identities server-side.
- X Scenario is read-only and cannot reassign work by itself.

### Connector layer
- Optional-after-login capability for approved Workspace work signals.
- Connector failure may disable work-signal sync, but MUST NOT disable Portal login/navigation.
- Existing Connector Script ID and Deployment ID are preserved unless a separately approved migration explicitly changes them.

### Gateway layer
- Shared governed data, X authorization, and approved integration actions.
- A Gateway transport failure must degrade the affected data module with a clear health state; it must not throw the user back out of the Portal identity session.

### SeaTalk
- SeaTalk remains an integration adapter, never an authentication dependency.
- Until an approved API/secret exists, its state is API_PENDING / unavailable without blocking Portal use.

## Session model
- Session stores identity reference, authoritative role, allowed perspectives, selected perspective, issued-at, expiry and auth epoch.
- Bumping auth epoch invalidates previous Portal sessions without deleting business data or Connector registrations.
- Re-login does not delete task, activity, hours, content, visitor, or Connector records.

## Failure policy

| Failure | Portal entry | Affected feature |
| --- | --- | --- |
| Connector unavailable | PASS | Workspace work-signal sync degraded |
| Gateway X endpoint unavailable | PASS | X shows unavailable health state |
| SeaTalk unavailable | PASS | SeaTalk integration unavailable |
| Role not in approved role source | DENY | Entire protected Portal |
| Invalid identity | DENY | Entire protected Portal |
| Non-manager requests X | PASS Portal / DENY X | X only |

## Mandatory release principle
There is no 99.x% Production Completed state. Every mandatory gate in QUALITY_GATE.md must pass before v8.1.0 can be marked Production Completed.
