import { Inject, Service } from 'typedi';
import { Op, Sequelize } from 'sequelize';
import { GroupID } from '../models/sde/GroupID';
import { TypeID } from '../models/sde/TypeID';
import { DIKeys } from '../lib/DIKeys';
import { mapify } from '../lib/util';
import { EveGroup, EveType } from '../types/SequelizeQuery';

@Service()
export default class SequelizeQueryService {

  constructor(
    @Inject(DIKeys.DB) private readonly sequelize: Sequelize,
  ) { }

  /*
    Return example:
    {
      '12038': { name: 'Purifier', group_id: 834 },
      '12041': { name: 'Purifier Blueprint', group_id: 105 }
    }
  */
  public async genEveTypes(
    typeIds: number[],
  ): Promise<{ [key: number]: EveType }> {
    const sqlResult = await this.sequelize.model(TypeID.MODEL_NAME).findAll({
      attributes: ['id', 'name', 'group_id'],
      where: {
        id: {
          [Op.in]: typeIds,
        }
      },
    });
    return mapify(sqlResult.map((res: TypeID) => res.get()), 'id');
  }

  /*
    Return example:
    {
      '1399': { name: 'Missile Guidance Computer Blueprint', category_id: 9 },
      '1400': { name: 'Missile Guidance Script', category_id: 8 },
      '1533': { name: 'Micro Jump Field Generators', category_id: 7 },
    }
  */
  public async genEveGroups(
    groupIds: number[],
  ): Promise<{ [key: number]: EveGroup }> {
    const sqlResult = await this.sequelize.model(GroupID.MODEL_NAME).findAll({
      attributes: ['id', 'name', 'category_id'],
      where: {
        id: {
          [Op.in]: groupIds,
        }
      },
    });
    return mapify(sqlResult.map((res: GroupID) => res.get()), 'id');
  }
}