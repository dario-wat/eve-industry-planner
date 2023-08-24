import { Express } from 'express';
import initEveLoginController from '../controllers/eveLoginController';
import initEveFetchDataController from '../features/eve_data/eveFetchDataController';
import initPlannedProductController from '../controllers/plannedProductController';
import initProductionPlanController from '../controllers/productionPlanController';
import loggedOutMiddleware from '../core/controller/loggedOutMiddleware';
import actorContextMiddleware from '../core/controller/actorContextMiddleware';
import Container from 'typedi';
import AccountController from '../core/account/AccountController';
import EsiCacheController from '../core/esi_cache/EsiCacheController';
import EveSdeDataController from '../core/sde/EveSdeDataController';
import ScribbleController from '../features/scribble/ScribbleController';
import AlwaysBuyItemController from '../features/always_buy/AlwaysBuyItemController';
import MaterialStationController from '../features/material_station/MaterialStationController';


// TODO replace Container typedi with a class service

// NOTE: every new controller needs to be added here
export function initControllers(app: Express): void {
  app.use(actorContextMiddleware);

  initEveLoginController(app);

  // Only login controller does not require a logged in user,
  // all other controllers will go through this middleware first
  app.use(loggedOutMiddleware);

  initEveFetchDataController(app);
  initPlannedProductController(app);
  Container.get(MaterialStationController).init(app);
  initProductionPlanController(app);

  Container.get(EsiCacheController).init(app);
  Container.get(AccountController).init(app);
  Container.get(EveSdeDataController).init(app);
  Container.get(ScribbleController).init(app);
  Container.get(AlwaysBuyItemController).init(app);
}