import { AsyncLocalStorage } from 'node:async_hooks';

export const REQUEST_ID_HEADER = 'X-Request-Id';

interface RequestContext {
  requestId: string;
}

// Carries per-request values through async calls without threading them
// through every function, e.g. so logs and calls to the Python backend
// can include the request ID.
export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}
