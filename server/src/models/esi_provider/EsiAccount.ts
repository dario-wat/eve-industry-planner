import { Account } from 'eve-esi-client';
import {
  Sequelize,
  DataTypes,
  Model,
  HasManyGetAssociationsMixin,
} from 'sequelize';
import { EsiCharacter } from './EsiCharacter';

export class EsiAccount
  extends Model
  implements Account {

  declare owner: string;

  declare getEsiCharacters: HasManyGetAssociationsMixin<EsiCharacter>;

  public async deleteAccount(): Promise<void> {
    await this.destroy();
  }

  public async deleteCharacters(): Promise<void> {
    const characters = await this.getEsiCharacters();
    await Promise.all(characters.map(async c => await c.destroy()));
  }
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
