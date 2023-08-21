import { DataTypes, Model, Sequelize } from 'sequelize';

/**
 * This is just free-form text that each account can create. Each user can
 * own multiple of these scribbles. These are usually used as notes, e.g.
 * shopping list, what to build, ...
 */
export class Scribble extends Model { }

export const scribbleModelDefine = (sequelize: Sequelize) => Scribble.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
    },
    text: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: Scribble.name,
    tableName: 'scribbles',
    timestamps: false,
  },
);