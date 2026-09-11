import { initialPerspective, modulesForPerspective, switchPerspective } from './interface-policy.js';

const SESSION_VERSION = 'v8.1.0';

function freezeCopy(value) {
  return Object.freeze(JSON.parse(JSON.stringify(value)));
}

export function createPortalAuthController({ identityProvider, roleClient, clock = () => Date.now() } = {}) {
  if (!identityProvider || typeof identityProvider.getCurrentIdentity !== 'function' || typeof identityProvider.signIn !== 'function' || typeof identityProvider.signOut !== 'function') {
    throw new Error('IDENTITY_PROVIDER_INVALID');
  }
  if (!roleClient || typeof roleClient.resolve !== 'function') {
    throw new Error('ROLE_CLIENT_INVALID');
  }

  let state = Object.freeze({ status: 'signed_out', session: null, error: null });
  const listeners = new Set();

  function publish(next) {
    state = Object.freeze(next);
    for (const listener of listeners) listener(state);
    return state;
  }

  async function establish(providerIdentity) {
    if (!providerIdentity) return publish({ status: 'signed_out', session: null, error: null });
    if (providerIdentity.verified !== true || !providerIdentity.email || !providerIdentity.idToken) {
      return publish({ status: 'blocked', session: null, error: 'IDENTITY_NOT_VERIFIED' });
    }

    const roleResult = await roleClient.resolve({
      idToken: providerIdentity.idToken,
      email: providerIdentity.email
    });

    if (!roleResult || roleResult.ok !== true || !roleResult.identity || !roleResult.identity.ok) {
      return publish({
        status: 'blocked',
        session: null,
        error: roleResult && roleResult.code ? roleResult.code : 'ROLE_RESOLUTION_FAILED'
      });
    }

    const identity = freezeCopy(roleResult.identity);
    const perspective = initialPerspective(identity);
    const session = freezeCopy({
      version: SESSION_VERSION,
      authenticatedAt: clock(),
      identity,
      perspective,
      modules: modulesForPerspective(identity, perspective)
    });

    return publish({ status: 'signed_in', session, error: null });
  }

  return Object.freeze({
    getState() {
      return state;
    },

    subscribe(listener) {
      if (typeof listener !== 'function') throw new Error('LISTENER_INVALID');
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async restore() {
      publish({ status: 'checking', session: null, error: null });
      try {
        return await establish(await identityProvider.getCurrentIdentity());
      } catch (error) {
        return publish({ status: 'blocked', session: null, error: error?.message || 'AUTH_RESTORE_FAILED' });
      }
    },

    async signIn() {
      publish({ status: 'checking', session: null, error: null });
      try {
        return await establish(await identityProvider.signIn());
      } catch (error) {
        return publish({ status: 'blocked', session: null, error: error?.message || 'AUTH_SIGN_IN_FAILED' });
      }
    },

    async signOut() {
      try {
        await identityProvider.signOut();
      } finally {
        publish({ status: 'signed_out', session: null, error: null });
      }
      return state;
    },

    changePerspective(requestedPerspective) {
      if (state.status !== 'signed_in' || !state.session) {
        return Object.freeze({ ok: false, code: 'AUTH_REQUIRED' });
      }
      const result = switchPerspective(state.session.identity, requestedPerspective);
      if (!result.ok) return Object.freeze(result);
      const session = freezeCopy({
        ...state.session,
        perspective: result.perspective,
        modules: result.modules
      });
      publish({ status: 'signed_in', session, error: null });
      return Object.freeze({ ok: true, session });
    }
  });
}

export function connectorHealthDoesNotAffectPortalSession(authState, connectorHealth) {
  return Object.freeze({
    auth: authState,
    connector: connectorHealth || { status: 'unknown' },
    portalAccessible: authState?.status === 'signed_in'
  });
}
