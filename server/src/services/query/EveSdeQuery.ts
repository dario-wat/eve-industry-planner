import { Op } from 'sequelize';
import { GroupID } from '../../models/sde/GroupID';
import { TypeID } from '../../models/sde/TypeID';
import { mapify } from '../../lib/util';
import { EveGroup, EveType } from '../../types/EveSdeQuery';

export namespace EveSdeQuery {

  /*
    Return example:
    {
      '12038': { name: 'Purifier', group_id: 834 },
      '12041': { name: 'Purifier Blueprint', group_id: 105 }
    }
  */
  export async function genEveTypes(
    typeIds: number[],
  ): Promise<{ [key: number]: EveType }> {
    const sqlResult = await TypeID.findAll({
      attributes: ['id', 'name', 'group_id'],
      where: {
        id: {
          [Op.in]: typeIds,
        }
      },
    });
    return mapify(sqlResult.map((res: TypeID) => res.get()), 'id');
  }

  export async function genEveTypesByName(
    typeNames: string[],
  ): Promise<{ [key: string]: EveType }> {
    const sqlResult = await TypeID.findAll({
      attributes: ['id', 'name', 'group_id'],
      where: {
        name: {
          [Op.in]: typeNames,
        }
      },
    });
    return mapify(sqlResult.map((res: TypeID) => res.get()), 'name');
  }

  /*
    Return example:
    {
      '1399': { name: 'Missile Guidance Computer Blueprint', category_id: 9 },
      '1400': { name: 'Missile Guidance Script', category_id: 8 },
      '1533': { name: 'Micro Jump Field Generators', category_id: 7 },
    }
  */
  export async function genEveGroups(
    groupIds: number[],
  ): Promise<{ [key: number]: EveGroup }> {
    const sqlResult = await GroupID.findAll({
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