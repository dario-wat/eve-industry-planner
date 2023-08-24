import { EsiCharacter } from 'core/esi/models/EsiCharacter';
import { AlwaysBuyItem } from 'features/always_buy/AlwaysBuyItem';
import { Scribble } from 'features/scribble/Scribble';
import {
  DataTypes,
  HasManyAddAssociationMixin,
  HasManyGetAssociationsMixin,
  HasManySetAssociationsMixin,
  Model,
  Sequelize,
} from 'sequelize';

/**
 * This is the Account model. Since each user can have multiple characters
 * logged in, we need to base our app on Accounts. Each Account can have
 * multiple EsiCharacters linked to it.
 * This also goes beyond just EsiAccount which are the Eve accounts (with
 * up to 3 characters).
 */
export class Account extends Model {
  declare id: number;

  declare getEsiCharacters: HasManyGetAssociationsMixin<EsiCharacter>;
  declare getScribbles: HasManyGetAssociationsMixin<Scribble>;
  declare getAlwaysBuyItems: HasManyGetAssociationsMixin<AlwaysBuyItem>;

  declare addEsiCharacter: HasManyAddAssociationMixin<EsiCharacter, 'characterId'>;
  declare addScribble: HasManyAddAssociationMixin<Scribble, 'id'>;
  declare addAlwaysBuyItem: HasManyAddAssociationMixin<AlwaysBuyItem, 'id'>;

  declare setAlwaysBuyItems: HasManySetAssociationsMixin<AlwaysBuyItem, 'id'>;
}

export const accountModelDefine = (sequelize: Sequelize) => {
  Account.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
    },
    {
      sequelize,
      modelName: Account.name,
      tableName: 'accounts',
    }
  );
};