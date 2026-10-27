import { Sequelize, DataTypes, Model } from 'sequelize';

/*
 * This is an SDE (Static Data Export) model.
 *
 * `activities` is the activities object from blueprints.yaml, stored whole:
 * copying, invention, manufacturing, research_material, research_time, and
 * reaction, including their materials, products, skills, and time.
 */

export class Blueprint extends Model {}

export const blueprintModelDefine = (sequelize: Sequelize) =>
  Blueprint.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      activities: {
        type: DataTypes.JSON,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: Blueprint.name,
      tableName: 'blueprints',
      timestamps: false,
    },
  );
