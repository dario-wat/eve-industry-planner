import { Request, Response, NextFunction } from 'express';

/** Returns null to the client if the user is logged out. */
export default function loggedOutMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.session.accountId == undefined) {
    return res.json(null);
  }
  else {
    next();
  }
}