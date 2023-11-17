import ActorContext from '../actor_context/ActorContext';
import { Request, Response, NextFunction } from 'express';

/** Adds ActorContext to res.locals.actorContext. */
export default function actorContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.log('Session: ', req.session);
  console.log('Session Account ID: ', req.session.accountId)
  const actorContext = new ActorContext(req.session.accountId ?? null);
  res.locals.actorContext = actorContext;
  next();
}