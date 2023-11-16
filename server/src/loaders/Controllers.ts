import { Express } from 'express';
import { Service } from 'typedi';
import loggedOutMiddleware from '../core/controller/loggedOutMiddleware';
import actorContextMiddleware from '../core/controller/actorContextMiddleware';
import AccountController from '../core/account/AccountController';
import EsiCacheController from '../core/esi_cache/EsiCacheController';
import EveSdeDataController from '../core/sde/EveSdeDataController';
import HealthController from '../core/controller/healthController';
import ScribbleController from '../features/scribble/ScribbleController';
import AlwaysBuyItemController from '../features/always_buy/AlwaysBuyItemController';
import MaterialStationController from '../features/material_station/MaterialStationController';
import EvePagesDataController from '../features/eve_data/EvePagesDataController';
import PlannedProductController from '../features/planned_product/PlannedProductController';
import ProductionPlanController from '../features/production_plan/ProductionPlanController';
import EveLoginController from '../core/controller/EveLoginController';
import IndustryJobController from '../features/industry_jobs/IndustryJobController';
import WalletController from '../features/wallet/WalletController';
import MarketController from '../features/market/MarketController';

// NOTE: every new controller needs to be added here
@Service()
export default class Controllers {

  constructor(
    private readonly eveLoginController: EveLoginController,
    private readonly evePagesDataController: EvePagesDataController,
    private readonly plannedProductController: PlannedProductController,
    private readonly materialStationController: MaterialStationController,
    private readonly productionPlanController: ProductionPlanController,
    private readonly esiCacheController: EsiCacheController,
    private readonly accountController: AccountController,
    private readonly eveSdeDataController: EveSdeDataController,
    private readonly scribbleController: ScribbleController,
    private readonly alwaysBuyItemController: AlwaysBuyItemController,
    private readonly industryJobController: IndustryJobController,
    private readonly walletController: WalletController,
    private readonly marketController: MarketController,
    private readonly healthController: HealthController,
  ) { }

  public init(app: Express): void {
    app.use(actorContextMiddleware);

    this.eveLoginController.init(app);

    // Only login controller does not require a logged in user,
    // all other controllers will go through this middleware first
    app.use(loggedOutMiddleware);

    this.evePagesDataController.init(app);
    this.plannedProductController.init(app);
    this.materialStationController.init(app);
    this.productionPlanController.init(app);
    this.esiCacheController.init(app);
    this.accountController.init(app);
    this.eveSdeDataController.init(app);
    this.scribbleController.init(app);
    this.alwaysBuyItemController.init(app);
    this.industryJobController.init(app);
    this.walletController.init(app);
    this.marketController.init(app);
    this.healthController.init(app);
  }
}
