import { Character } from 'eve-esi-client';
import {
  Sequelize,
  DataTypes,
  Model,
  HasManyGetAssociationsMixin,
  ForeignKey,
} from 'sequelize';
import { EsiAccount } from './EsiAccount';
import { EsiToken } from './EsiToken';
import { Account } from '../../core/account/Account';

/**
 * EsiCharacter represents an EVE character. Up to 3 EsiCharacters are a part
 * of an EveAccount. But for the purposes of this app we can group as many
 * EsiCharacters from as many EsiAccounts into a single Account.
 */
export class EsiCharacter extends Model implements Character {

  declare characterId: number;
  declare characterName: string;
  declare owner: ForeignKey<EsiAccount['owner']>;
  declare accountId: ForeignKey<Account['id']>;

  declare getEsiTokens: HasManyGetAssociationsMixin<EsiToken>;

  /** Updates this EsiCharacter in the DB. */
  public async updateCharacter(
    owner: string,
    characterName: string
  ): Promise<void> {
    await this.update({ characterName, owner });
  }

  /** Deletes this EsiCharacter from the DB. */
  public async deleteCharacter(): Promise<void> {
    await this.destroy();
  }

  /** Deletes tokens associated with this EsiCharacter from the DB. */
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
