SELLER EDUCATION TEAM HUB v8.0.0r8 — X PHASES 1-3 ONE CLICK
============================================================

PURPOSE
- Phase 1: force a fresh Seller Edu OS login session for every portal user without deleting task/business data.
- Phase 2: activate three role-aware interfaces: Member, Team Lead, Manager. Managers can preview all three perspectives.
- Phase 3: add secure Manager-only X entry and update the existing Connector/Gateway in place. No new Apps Script project or deployment ID is created.

RUN
1. Extract this branch/package.
2. Double-click ONE_CLICK_X_PHASES_1_3.cmd
3. Use the existing company Google account if clasp/Firebase asks for authentication.
4. When complete, open https://selleredu-portal.web.app/
5. Every user signs in with their own Google Workspace email.

SAFETY
- Production root is fixed to C:\SEDU_r7.
- Existing Keep to backup is NEVER deleted or overwritten.
- A new pre-change backup is created under:
  C:\SEDU_r7\Keep to backup\X_PHASES_1_3_BEFORE_<timestamp>\
- Existing TASK/WORK/CONTENT data is not reset.
- Existing Connector/Gateway Script IDs and Deployment IDs are preserved.
- Apps Script access remains DOMAIN. Connector remains USER_ACCESSING. Gateway remains USER_DEPLOYING.
- Windows ExecutionPolicy is not modified.
- Firebase Hosting is deployed last, only after both Apps Script updates verify the existing deployment IDs.

ROLE SOURCE
The Seller Edu OS role in the approved roster is authoritative for interface selection.
Business title is preserved separately and does not override Seller Edu OS role.

MANAGER
- punn.phoolsuk@shopee.com
- totoh.taponchai@shopee.com

TEAM LEAD
- bank.cheewath@shopeemobile-external.com
- first.thammaki@shopee.com

MEMBER
- aun.intharavong@shopee.com
- opor.anukhroh@shopee.com
- hagrid.pornpras@shopee.com
- tongta.thaisath@shopee.com
- earth.chamnanphon@shopee.com
- bonus.sanwong@shopee.com
- dear.kulnaratorn@shopee.com
- mook.siriprap@shopee.com
- tao.sitikham@shopee.com

IMPORTANT LIVE ACCEPTANCE
This package performs Phases 1-3. It does NOT mark Production Acceptance complete. Phase 4 still requires a real browser login check for at least one Member, one Team Lead, and one Manager, plus the external-domain Team Lead account.

REPORT
C:\SEDU_r7\SELLEREDU_V800R8_X_PHASE1_3_REPORT.json
