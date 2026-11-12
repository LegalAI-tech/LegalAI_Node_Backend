import type { Request, Response, NextFunction, RequestHandler } from 'express';
import crypto from 'crypto';
import { REQUEST_ID_HEADER, requestContext } from '../utils/request-context.js';

// Accept a caller's ID only if it is short and header-safe; otherwise mint one
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * Gives every request an ID, returns it in the X-Request-Id response header,
 * and makes it available to logs and outgoing calls via requestContext.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.get(REQUEST_ID_HEADER);
  const requestId = incoming && VALID_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();

  res.setHeader(REQUEST_ID_HEADER, requestId);
  requestContext.run({ requestId }, next);
}

/**
 * Wrap stream-parsing middleware such as multer with this. Multer calls next()
 * from upload stream events, which run outside the request's context, so
 * without it everything after an upload loses the request ID.
 */
export function keepRequestContext(middleware: RequestHandler): RequestHandler {
  return (req, res, next) => {
    const store = requestContext.getStore();
    const resume: NextFunction = (err?: unknown) =>
      store ? requestContext.run(store, () => next(err)) : next(err);

    return middleware(req, res, resume);
  };
}
