import { Request, Response } from 'express';
import { Service } from 'typedi';
import PlannedProductService from './PlannedProductService';
import Controller from '../../core/controller/Controller';
import ActorContext from '../../core/actor_context/ActorContext';

@Service()
export default class PlannedProductController extends Controller {

  constructor(
    private readonly plannedProductService: PlannedProductService,
  ) {
    super();
  }

  protected initController(): void {
    /** Returns all planned products for the current ActorContext. */
    this.appGet(
      '/planned_products',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const products = await this.plannedProductService.genAllPlannedProducts(
          actorContext
        );
        res.json(products);
      },
    );

    /** Returns planned product for the specific group. */
    this.appGet(
      '/planned_products_group/:group',
      async (req: Request, res: Response, actorContext: ActorContext) => {
        const products = await this.plannedProductService.genPlannedProductsForGroup(
          actorContext,
          req.params.group,
        );
        res.json(products);
      },
    );

    /*
      Input for testing:
        Kikimora 10
        Nanofiber Internal Structure II 10
        Entropic Radiation Sink II 20
        1MN Afterburner II 10
        Multispectrum Shield Hardener II 10
        Light Entropic Disintegrator II 10
        Small Core Defense Field Extender II 20
    */
    this.appPost(
      '/planned_products_recreate',
      async (req: Request, res: Response, actorContext: ActorContext) => {
        const products = await this.plannedProductService.genParseAndRecreate(
          actorContext,
          req.body.group,
          req.body.text,
        );
        res.json(products);
      },
    );

    /** Deletes a single item from a specific group. */
    this.appDelete(
      '/planned_product_delete/:group/:type_id',
      async (req: Request, res: Response, actorContext: ActorContext) => {
        await this.plannedProductService.genDelete(
          actorContext,
          req.params.group,
          Number(req.params.type_id),
        );
        res.status(200).end();
      },
    );

    /** Deletes an entire group. */
    this.appDelete(
      '/planned_product_group_delete/:group',
      async (req: Request, res: Response, actorContext: ActorContext) => {
        await this.plannedProductService.genDeleteGroup(
          actorContext,
          req.params.group,
        );
        res.status(200).end();
      },
    );

    /** Adds a single item to a specific group. */
    this.appPost(
      '/planned_product_add',
      async (req: Request, res: Response, actorContext: ActorContext) => {
        await this.plannedProductService.genAddPlannedProduct(
          actorContext,
          req.body.group,
          req.body.typeName,
          req.body.quantity,
        );
        res.status(200).end();
      },
    );
  }
}
