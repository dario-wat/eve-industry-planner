import { Request, Response } from 'express';
import { Service } from 'typedi';
import AccountService from '../core/account/AccountService';
import ActorContext from '../core/actor_context/ActorContext';
import Controller from '../core/Controller';

@Service()
export default class LinkedCharactersController extends Controller {

  constructor(
    private readonly accountService: AccountService,
  ) {
    super();
  }

  protected initController(): void {
    this.appGet('/linked_characters',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const output = await this.accountService.genLinkedCharacters(
          actorContext
        );
        res.json(output);
      },)
  }
}