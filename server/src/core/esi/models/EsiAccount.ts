import {
  Sequelize,
  DataTypes,
  Model,
  HasManyGetAssociationsMixin,
} from 'sequelize';
import { EsiCharacter } from './EsiCharacter';

/** 
 * EsiAccount corresponds to an EVE Online account that can contain up to 3 
 * characters. 
 */
export class EsiAccount extends Model {

  declare owner: string;

  declare getEsiCharacters: HasManyGetAssociationsMixin<EsiCharacter>;
}

export const esiAccountModelDefine = (sequelize: Sequelize) =>
  EsiAccount.init(
    {
      owner: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
    },
    {
      sequelize,
      modelName: EsiAccount.name,
      tableName: 'esi_accounts',
      timestamps: false,
    },
  );
