# v8.1.0 Server Role Resolution Contract

## Purpose
Keep employee roster and privileged role assignment off public Firebase Hosting and off public GitHub assets.

## Request
Client sends a Google identity token obtained from the approved portal identity provider to a server-side role endpoint.

```json
{
  "idToken": "<short-lived Google identity token>"
}
```

Client-supplied email is informational only and MUST NOT be trusted for authorization.

## Server processing
1. Verify token signature, audience, issuer and expiry.
2. Read the verified email claim from the verified token.
3. Normalize the email to lower-case.
4. Resolve the email against the private Seller Edu OS role source.
5. Return only the minimum profile fields required by the UI.
6. Never return the full roster.
7. Never allow a requested role/perspective in the request to override authoritative role.

## Success response
```json
{
  "ok": true,
  "identity": {
    "ok": true,
    "email": "verified@example.com",
    "role": "Member | Team Lead | Manager",
    "profile": {
      "nickname": "Display name",
      "businessRole": "Business role",
      "team": "Team"
    },
    "allowedPerspectives": ["Member"],
    "defaultPerspective": "Member"
  }
}
```

Manager receives `Member`, `Team Lead`, `Manager` in allowedPerspectives. Team Lead receives only `Team Lead`. Member receives only `Member`.

## Denied response
HTTP 403:
```json
{
  "ok": false,
  "code": "PORTAL_ACCESS_NOT_REGISTERED"
}
```

Invalid/unverified token uses HTTP 401 and `IDENTITY_NOT_VERIFIED`.

## Isolation requirements
- Connector registration is not consulted by this endpoint.
- Gateway health is not consulted to decide whether Portal login succeeds.
- SeaTalk health is never consulted for authentication.
- A role endpoint outage may prevent new authentication, but must not be confused with Connector/Gateway business integration errors.

## Session
Portal session contains only the resolved identity result, selected perspective and auth epoch/session version. Session invalidation must never delete business data or Connector registrations.

## X authorization
Every X data request must verify the current server identity independently. Client-side role state is not sufficient authorization. Non-manager requests return HTTP 403 with `X_ACCESS_DENIED`.
