import { Inject, Service } from 'typedi';
import { Op, Sequelize } from 'sequelize';
import { TypeID } from '../models/TypeID';
import { DIKeys } from '../lib/DIKeys';
import { mapify } from '../lib/util';

@Service()
export default class SequelizeQueryService {

  constructor(
    @Inject(DIKeys.DB) private readonly sequelize: Sequelize,
  ) { }

  /*
    Return example:
    {
      '200': 'Phased Plasma L',
      '201': 'EMP L',
      '202': 'Mjolnir Cruise Missile',
    }
  */
  public async genNamesFromTypeIds(typeIds: number[]) {
    const sqlResult = await this.sequelize.model(TypeID.MODEL_NAME).findAll({
      attributes: ['id', 'name'],
      where: {
        id: {
          [Op.in]: typeIds,
        }
      },
    });
    return mapify(sqlResult.map((res: TypeID) => res.get()), 'id', 'name');
  }
}