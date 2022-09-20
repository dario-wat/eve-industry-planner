import { Account } from 'eve-esi-client';
import {
  Sequelize,
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  HasManyGetAssociationsMixin,
} from 'sequelize';
import { EsiCharacter } from './EsiCharacter';

export class EsiAccount
  extends Model<
    InferAttributes<EsiAccount>,
    InferCreationAttributes<EsiAccount>
  > {

  declare owner: string;

  declare getEsiCharacters: HasManyGetAssociationsMixin<EsiCharacter>;
}

export const esiAccountModelDefine = (sequelize: Sequelize) => EsiAccount.init(
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
