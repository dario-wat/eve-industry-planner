import ActorContext from '../actor_context/ActorContext';
import { Request, Response, NextFunction } from 'express';

/** Adds ActorContext to res.locals.actorContext. */
export default function actorContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const actorContext = new ActorContext(req.session.accountId ?? null);
  res.locals.actorContext = actorContext;
  next();
}