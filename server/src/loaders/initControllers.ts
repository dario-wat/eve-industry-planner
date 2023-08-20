import { Express } from 'express';
import initEveLoginController from '../controllers/eveLoginController';
import initEveFetchDataController from '../controllers/eveFetchDataController';
import initPlannedProductController from '../controllers/plannedProductController';
import initMaterialStationController from '../controllers/materialStationController';
import initProductionPlanController from '../controllers/productionPlanController';
import initClearCacheController from '../controllers/clearCacheController';
import initSdeDataController from '../controllers/sdeDataController';
import initScribbleController from '../controllers/scribbleController';
import initAlwaysBuyItemController from '../controllers/alwaysBuyItemController';
import loggedOutMiddleware from '../controllers/loggedOutMiddleware';
import actorContextMiddleware from '../controllers/actorContextMiddleware';
import Container from 'typedi';
import AccountController from '../core/account/AccountController';


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
  initMaterialStationController(app);
  initProductionPlanController(app);
  initClearCacheController(app);

  Container.get(AccountController).init(app);

  initSdeDataController(app);
  initScribbleController(app);
  initAlwaysBuyItemController(app);
}