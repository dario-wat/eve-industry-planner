import { Express } from 'express';
import initEveLoginController from '../controllers/eveLoginController';
import initEveFetchDataController from '../controllers/eveFetchDataController';
import initPlannedProductController from '../controllers/plannedProductController';
import initMaterialStationController from '../controllers/materialStationController';
import initProductionPlanController from '../controllers/productionPlanController';
import initClearCacheController from '../controllers/clearCacheController';
import initLinkedCharactersController from '../controllers/linkedCharactersController';
import initSdeDataController from '../controllers/sdeDataController';
import loggedOutMiddleware from '../controllers/loggedOutMiddleware';

// NOTE: every new controller needs to be added here
export function initControllers(app: Express): void {
  initEveLoginController(app);

  // Only login controller does not require a logged in user,
  // all other controllers will go through this middleware first
  app.use(loggedOutMiddleware);

  initEveFetchDataController(app);
  initPlannedProductController(app);
  initMaterialStationController(app);
  initProductionPlanController(app);
  initClearCacheController(app);
  initLinkedCharactersController(app);
  initSdeDataController(app);
}