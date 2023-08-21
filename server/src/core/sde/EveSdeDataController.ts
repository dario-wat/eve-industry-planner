import { Request, Response } from 'express';
import { Service } from 'typedi';
import Controller from '../controller/Controller';
import ActorContext from '../actor_context/ActorContext';
import EveSdeData from './EveSdeData';
import { ITEM_CATEGORY_IDS } from '../../const/Categories';

@Service()
export default class EveSdeDataController extends Controller {

  constructor(
    private readonly sdeData: EveSdeData,
  ) {
    super();
  }

  protected initController(): void {

    /** Queries SDE data for type IDs of items. */
    this.appGet(
      '/type_ids_items',
      async (_req: Request, res: Response, _actorContext: ActorContext) => {
        const itemTypeIds = Object.values(this.sdeData.types).filter(t => {
          const categoryId = this.sdeData.categoryIdFromTypeId(t.id);
          return categoryId !== undefined && ITEM_CATEGORY_IDS.includes(categoryId);
        });
        res.json(itemTypeIds);
      },
    );
  }
}