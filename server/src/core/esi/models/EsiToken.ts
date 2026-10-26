import { Sequelize, DataTypes, Model, ForeignKey, CreationOptional } from 'sequelize';
import { EsiCharacter } from './EsiCharacter';
import { requiredScopes } from '../../../const/EveScopes';

/**
 * This is the model representation of an ESI Token. This is stored in the
 * DB and used to fetch data from ESI. EsiTokenStore reads and writes it.
 *
 * A character has one login token. The table does not enforce that, so
 * EsiTokenStore replaces the character's rows on every login, and anything
 * that reads a token uses `genForCharacter`, which picks the newest usable row.
 */
export class EsiToken extends Model {
  declare id: CreationOptional<number>;
  declare accessToken: string;
  declare refreshToken: string;
  declare expires: Date;
  declare scopes: CreationOptional<string[]>;
  declare characterId: ForeignKey<EsiCharacter['characterId']>;

  /**
   * The character's login token: the newest row that has every one of
   * `scopes`, or null. A character whose stored token lacks a required scope
   * has to log in again, so it counts as having no token.
   */
  public static async genForCharacter(
    characterId: number,
    scopes: string[] = requiredScopes,
  ): Promise<EsiToken | null> {
    const tokens = await EsiToken.findAll({
      where: { characterId },
      order: [['id', 'DESC']],
    });
    return tokens.find((token) => scopes.every((scope) => token.scopes.includes(scope))) ?? null;
  }
}

export const esiTokenModelDefine = (sequelize: Sequelize) =>
  EsiToken.init(
    {
      accessToken: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      refreshToken: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      expires: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      scopes: {
        type: DataTypes.TEXT,
        get() {
          return JSON.parse(this.getDataValue('scopes'));
        },
        set(scopes: string[]) {
          this.setDataValue('scopes', JSON.stringify(scopes));
        },
      },
    },
    {
      sequelize,
      modelName: EsiToken.name,
      tableName: 'esi_tokens',
      timestamps: false,
    },
  );
