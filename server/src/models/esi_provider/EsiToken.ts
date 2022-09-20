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

  declare access_token: string;
  declare refresh_token: string;
  declare expires: Date;
  declare scopes: CreationOptional<string>;

  declare characterId: ForeignKey<EsiCharacter['characterId']>;
}

export const esiTokenModelDefine = (sequelize: Sequelize) => EsiToken.init(
  {
    access_token: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    refresh_token: {
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
    }
  },
  {
    sequelize,
    modelName: EsiToken.name,
    tableName: 'esi_tokens',
    timestamps: false,
  },
);