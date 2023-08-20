import { Router, Request, Response } from 'express';
import ActorContext from './actor_context/ActorContext';

/** Helper type for the improved controller handler. */
type RouterHandlerFn = (
  req: Request,
  res: Response,
  actorContext: ActorContext,
) => Promise<void>;

/**
 * Every controller should use ActorContext, but getting it (untyped) 
 * from res.locals.actorContext is a bit clumsy.
 * So we use this class to do that. It provides several improved functions
 * that are alternatives to app.get, app.post and so on, that better handle
 * ActorContexts.
 * 
 * Also changing controllers to classes makes dependency injection better
 * since we can inject into constructor params instead of using Container.
 */
export default abstract class Controller {

  private router: Router = Router();

  /** This should be called to initialize this controller. */
  public init(app: Router): void {
    app.use('/', this.router);

    this.initController();
  }

  /** This is where all the logic for the controllers go. */
  protected abstract initController(): void;

  /** Helper function to define a `get` endpoint. */
  protected appGet(route: string, handler: RouterHandlerFn): void {
    this.router.get(route, async (req: Request, res: Response) => {
      await handler(req, res, res.locals.actorContext);
    });
  }
}