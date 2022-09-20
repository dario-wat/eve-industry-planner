import { Character } from 'eve-esi-client';
import {
  Sequelize,
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  HasManyGetAssociationsMixin,
  NonAttribute,
  ForeignKey,
} from 'sequelize';
import { EsiAccount } from './EsiAccount';
import { EsiToken } from './EsiToken';

export class EsiCharacter
  extends Model<
    InferAttributes<EsiCharacter>,
    InferCreationAttributes<EsiCharacter>
  > {

  declare characterId: number;
  declare characterName: string;

  declare ownerId: ForeignKey<EsiAccount['owner']>;

  declare getEsiTokens: HasManyGetAssociationsMixin<EsiToken>;
}

export const esiCharacterModelDefine =
  (sequelize: Sequelize) => EsiCharacter.init(
    {
      characterId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      characterName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: EsiCharacter.name,
      tableName: 'esi_characters',
      timestamps: false,
    }
  );
