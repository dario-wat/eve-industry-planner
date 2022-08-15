import { Inject, Service } from 'typedi';
import { Op, Sequelize } from 'sequelize';
import { TypeID } from '../models/TypeID';

@Service()
export default class SequelizeQueryService {

  constructor(
    @Inject('db') private readonly sequelize: Sequelize,
  ) { }

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