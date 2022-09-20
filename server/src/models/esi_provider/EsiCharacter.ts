import { Character } from 'eve-esi-client';
import {
  Sequelize,
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  HasManyGetAssociationsMixin,
  ForeignKey,
  NonAttribute,
} from 'sequelize';
import { EsiAccount } from './EsiAccount';
import { EsiToken } from './EsiToken';

export class EsiCharacter
  extends Model<
    InferAttributes<EsiCharacter, { omit: 'owner' }>,
    InferCreationAttributes<EsiCharacter, { omit: 'owner' }>
  >
  implements Character {

  declare characterId: number;
  declare characterName: string;
  declare ownerId: ForeignKey<EsiAccount['owner']>;

  declare getEsiTokens: HasManyGetAssociationsMixin<EsiToken>;

  public get owner(): string {  // Omitted
    return this.ownerId;
  }

  public async updateCharacter(
    owner: string,
    characterName: string
  ): Promise<void> {
    await this.update({ characterName, ownerId: owner });
  }

  public async deleteCharacter(): Promise<void> {
    await this.destroy();
  }

  public async deleteTokens(): Promise<void> {
    const tokens = await this.getEsiTokens();
    await Promise.all(tokens.map(async t => await t.destroy()));
  }
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
