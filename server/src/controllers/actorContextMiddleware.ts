import { Request, Response, NextFunction } from 'express';
import { Account } from '../core/account/Account';

/**
 * This class represents the currently logged in user/account/actor.
 * It contains a bunch of data and methods to manage the currently logged in
 * user.
 */
export class ActorContext {

  constructor(
    public readonly accountId: number | null,
    public readonly esiCharacterIds: ReadonlyArray<number>,
  ) { }

  public async genAccount(): Promise<Account | null> {
    if (this.accountId === null) {
      return null;
    }

    return await Account.findByPk(this.accountId);
  }

  public async genxAccount(): Promise<Account> {
    return (await Account.findByPk(this.accountId!))!;
  }
}

export function actorContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // TODO esiCharacterIds
  const actorContext = new ActorContext(req.session.accountId ?? null, []);
  res.locals.actorContext = actorContext;
  next();
}