import { Express } from 'express';
import Container from 'typedi';
import loggedOutMiddleware from '../core/controller/loggedOutMiddleware';
import actorContextMiddleware from '../core/controller/actorContextMiddleware';
import AccountController from '../core/account/AccountController';
import EsiCacheController from '../core/esi_cache/EsiCacheController';
import EveSdeDataController from '../core/sde/EveSdeDataController';
import ScribbleController from '../features/scribble/ScribbleController';
import AlwaysBuyItemController from '../features/always_buy/AlwaysBuyItemController';
import MaterialStationController from '../features/material_station/MaterialStationController';
import EvePagesDataController from '../features/eve_data/EvePagesDataController';
import PlannedProductController from '../features/planned_product/PlannedProductController';
import ProductionPlanController from '../features/production_plan/ProductionPlanController';
import EveLoginController from '../core/controller/EveLoginController';


// TODO replace Container typedi with a class service

// NOTE: every new controller needs to be added here
export function initControllers(app: Express): void {
  app.use(actorContextMiddleware);

  Container.get(EveLoginController).init(app);

  // Only login controller does not require a logged in user,
  // all other controllers will go through this middleware first
  app.use(loggedOutMiddleware);

  Container.get(EvePagesDataController).init(app);
  Container.get(PlannedProductController).init(app);
  Container.get(MaterialStationController).init(app);
  Container.get(ProductionPlanController).init(app);

  Container.get(EsiCacheController).init(app);
  Container.get(AccountController).init(app);
  Container.get(EveSdeDataController).init(app);
  Container.get(ScribbleController).init(app);
  Container.get(AlwaysBuyItemController).init(app);
}