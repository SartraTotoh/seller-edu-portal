export const SellerEduRoles = Object.freeze({
  MEMBER: 'Member',
  TEAM_LEAD: 'Team Lead',
  MANAGER: 'Manager'
});

const VALID_ROLES = new Set(Object.values(SellerEduRoles));

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function buildRoleIndex(roster) {
  if (!roster || !Array.isArray(roster.users)) {
    throw new Error('ROLE_ROSTER_INVALID');
  }
  const index = new Map();
  for (const row of roster.users) {
    const email = normalizeEmail(row.email);
    const role = String(row.sellerEduOS || '').trim();
    if (!email) throw new Error('ROLE_ROSTER_EMAIL_MISSING');
    if (!VALID_ROLES.has(role)) throw new Error('ROLE_ROSTER_ROLE_INVALID:' + email);
    if (index.has(email)) throw new Error('ROLE_ROSTER_DUPLICATE_EMAIL:' + email);
    index.set(email, Object.freeze({ ...row, email, sellerEduOS: role }));
  }
  return index;
}

export function resolveSellerEduIdentity(verifiedGoogleIdentity, roleIndex) {
  if (!verifiedGoogleIdentity || verifiedGoogleIdentity.verified !== true) {
    return Object.freeze({ ok: false, code: 'IDENTITY_NOT_VERIFIED' });
  }
  const email = normalizeEmail(verifiedGoogleIdentity.email);
  if (!email) return Object.freeze({ ok: false, code: 'IDENTITY_EMAIL_MISSING' });
  const profile = roleIndex.get(email);
  if (!profile) {
    return Object.freeze({ ok: false, code: 'PORTAL_ACCESS_NOT_REGISTERED', email });
  }
  const role = profile.sellerEduOS;
  const allowedPerspectives = role === SellerEduRoles.MANAGER
    ? [SellerEduRoles.MEMBER, SellerEduRoles.TEAM_LEAD, SellerEduRoles.MANAGER]
    : role === SellerEduRoles.TEAM_LEAD
      ? [SellerEduRoles.TEAM_LEAD]
      : [SellerEduRoles.MEMBER];
  return Object.freeze({
    ok: true,
    email,
    role,
    profile,
    allowedPerspectives,
    defaultPerspective: role
  });
}

export function canUsePerspective(identity, perspective) {
  return Boolean(identity && identity.ok && identity.allowedPerspectives.includes(perspective));
}

export function canAccessX(identity) {
  return Boolean(identity && identity.ok && identity.role === SellerEduRoles.MANAGER);
}
