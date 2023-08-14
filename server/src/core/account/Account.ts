import { DataTypes, Model, Sequelize } from 'sequelize';

/**
 * This is the Account model. Since each user can have multiple characters
 * logged in, we need to base our app on Accounts. Each Account can have
 * multiple EsiCharacters linked to it.
 * This also goes beyond just EsiAccount which are the Eve accounts (with
 * up to 3 characters).
 */
export class Account extends Model {
  declare id: number;
}

export const accountModelDefine = (sequelize: Sequelize) => {
  Account.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
    },
    {
      sequelize,
      modelName: Account.name,
      tableName: 'accounts',
    }
  );
};