import { DataTypes, Model, Sequelize } from 'sequelize';

export class Scribble extends Model { }

export const scribbleModelDefine = (sequelize: Sequelize) => Scribble.init(
  {
    characterId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      primaryKey: true,
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