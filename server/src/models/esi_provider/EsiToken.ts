import { Token } from 'eve-esi-client';
import {
  Sequelize,
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  ForeignKey,
  CreationOptional,
} from 'sequelize';
import { EsiCharacter } from './EsiCharacter';

export class EsiToken
  extends Model<
    InferAttributes<EsiToken>,
    InferCreationAttributes<EsiToken>
  >
  implements Token {

  declare accessToken: string;
  declare refreshToken: string;
  declare expires: Date;
  declare scopes: CreationOptional<string[]>;
  declare characterId: ForeignKey<EsiCharacter['characterId']>;

  public async updateToken(
    accessToken: string,
    refreshToken: string,
    expires: Date,
    scopes?: string | string[]
  ): Promise<void> {
    // TODO needs to be finished
    await this.update({
      accessToken,
      refreshToken,
      expires,
      // scopes,
    });
  }

  public async deleteToken(): Promise<void> {
    await this.destroy();
  }
}

export const esiTokenModelDefine = (sequelize: Sequelize) => EsiToken.init(
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
        const sc = this.getDataValue('scopes');
        // @ts-ignore
        return JSON.parse(sc);
      },
      set(scopes: string[]) {
        // @ts-ignore
        this.setDataValue('scopes', JSON.stringify(scopes));
      },
    }
  },
  {
    sequelize,
    modelName: EsiToken.name,
    tableName: 'esi_tokens',
    timestamps: false,
  },
);