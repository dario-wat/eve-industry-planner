import {
  Sequelize,
  DataTypes,
  Model,
  ForeignKey,
  CreationOptional,
} from 'sequelize';
import { EsiCharacter } from './EsiCharacter';

/**
 * This is the model representation of an ESI Token. This is stored in the
 * DB and used to fetch data from ESI. EsiTokenStore reads and writes it.
 */
export class EsiToken extends Model {

  declare accessToken: string;
  declare refreshToken: string;
  declare expires: Date;
  declare scopes: CreationOptional<string[]>;
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