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
  > {

  declare accessToken: string;
  declare refreshToken: string;
  declare expires: Date;
  declare scopes: CreationOptional<string>;

  declare characterId: ForeignKey<EsiCharacter['characterId']>;
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
        return JSON.parse(sc);
      },
      set(scopes: string[]) {
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