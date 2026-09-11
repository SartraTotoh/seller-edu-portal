import { SellerEduRoles, canAccessX, canUsePerspective } from './role-resolver.js';

const COMMON = Object.freeze(['overview','taskhub','hours','content','people','settings']);
const LEAD = Object.freeze([...COMMON,'insights']);
const MANAGER = Object.freeze([...LEAD,'x']);

export function modulesForPerspective(identity, perspective) {
  if (!identity || !identity.ok) return [];
  if (!canUsePerspective(identity, perspective)) return [];
  if (perspective === SellerEduRoles.MANAGER) return canAccessX(identity) ? [...MANAGER] : [];
  if (perspective === SellerEduRoles.TEAM_LEAD) return [...LEAD];
  return [...COMMON];
}

export function initialPerspective(identity) {
  if (!identity || !identity.ok) return null;
  return identity.defaultPerspective;
}

export function switchPerspective(identity, requestedPerspective) {
  if (!canUsePerspective(identity, requestedPerspective)) {
    return { ok:false, code:'PERSPECTIVE_NOT_ALLOWED' };
  }
  return { ok:true, perspective:requestedPerspective, modules:modulesForPerspective(identity, requestedPerspective) };
}

export function xNavigationVisible(identity, perspective) {
  return perspective === SellerEduRoles.MANAGER && canAccessX(identity);
}
