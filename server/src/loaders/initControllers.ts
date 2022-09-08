import { Express } from 'express';
import initEveLoginController from '../controllers/eveLoginController';
import initEveFetchDataController from '../controllers/eveFetchDataController';
import initPlannedProductController from '../controllers/plannedProductController';
import initMaterialStationController from '../controllers/materialStationController';

// NOTE: every new controller needs to be added here
export function initControllers(app: Express): void {
  initEveLoginController(app);
  initEveFetchDataController(app);
  initPlannedProductController(app);
  initMaterialStationController(app);
}