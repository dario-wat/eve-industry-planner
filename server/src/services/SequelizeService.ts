import { Service } from 'typedi';
import { Sequelize } from 'sequelize';
import { DB_DIALECT, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USERNAME } from '../lib/DBConfig';

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
      }
    );
  }

  public get(): Sequelize {
    return this.sequelize;
  }
}