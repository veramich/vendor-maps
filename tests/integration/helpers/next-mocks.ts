// Mocks the request-scoped Next.js APIs that server actions call, so the
// actions can run outside a real HTTP request:
//   - next/headers `headers()` -> returns our forged cookie header
//   - next/navigation `redirect()` -> throws a catchable RedirectError, matching
//     Next's real control-flow (a successful action ends by throwing NEXT_REDIRECT)
//
// Requires `--experimental-test-module-mocks`. Call setSessionCookie() before
// invoking an action to control which session the guard sees ("" = signed out).

import { mock } from "node:test";

let currentCookie = "";

export function setSessionCookie(cookieHeader: string) {
  currentCookie = cookieHeader;
}

export class RedirectError extends Error {
  constructor(public location: string) {
    super(`NEXT_REDIRECT:${location}`);
    this.name = "RedirectError";
  }
}

// Runs an action expected to end in redirect(); returns the redirect target.
// Fails if the action returns normally without redirecting.
export async function expectRedirect(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof RedirectError) return e.location;
    throw e;
  }
  throw new Error("expected the action to redirect, but it returned normally");
}

export function installNextMocks() {
  mock.module("next/headers", {
    namedExports: {
      headers: async () => new Headers(currentCookie ? { cookie: currentCookie } : {}),
      cookies: async () => new Map(),
    },
  });
  mock.module("next/navigation", {
    namedExports: {
      redirect: (location: string) => {
        throw new RedirectError(location);
      },
    },
  });
}
