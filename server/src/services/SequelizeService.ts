import { Service } from 'typedi';
import { Op, Sequelize } from 'sequelize';
import { DB_DIALECT, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USERNAME } from '../lib/DBConfig';
import { TypeID } from '../models/TypeID';

@Service()
export default class SequelizeService {
  private sequelize: Sequelize;

  constructor() {
    this.sequelize = new Sequelize(
      DB_NAME,
      DB_USERNAME,
      DB_PASSWORD,
      {
        host: DB_HOST,
        port: DB_PORT,
        dialect: DB_DIALECT,
        logging: false,
      }
    );
  }

  public getSequelize(): Sequelize {
    return this.sequelize;
  }

  public async genNamesFromTypeIds(typeIds: number[]) {
    const sqlResult = await this.sequelize.model(TypeID.MODEL_NAME).findAll({
      attributes: ['id', 'name'],
      where: {
        id: {
          [Op.in]: typeIds,
        }
      },
    });
    return sqlResult.map((res: TypeID) => res.get());
  }
}