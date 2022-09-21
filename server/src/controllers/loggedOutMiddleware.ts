import { Request, Response, NextFunction } from 'express';

export default function loggedOutMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.session.characterId == undefined) {
    return res.json(null);
  }
  else {
    next();
  }
}