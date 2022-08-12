import { Sequelize, DataTypes, Model, INTEGER } from 'sequelize';

/* 
* This is an SDE (Static Data Export) model.
*
* This is what the full schema looks like:
* KEY: blueprint_id: INTEGER
* activities:
*   copying:
*     materials: ARRAY [
*      quantity: INTEGER
*      typeID: INTEGER (foreign key)
*     ]
*     skills: ARRAY [
*       level: INTEGER
*       typeID: INTEGER (foreign key)
*     ]
*     time: INTEGER
*   invention:
*     materials: ARRAY [
*      quantity: INTEGER
*      typeID: INTEGER (foreign key)
*     ]
*     products: ARRAY [
*       probability: DOUBLE
*       quantity: INTEGER  
*       typeID: INTEGER (foreign key)
*     ]
*     skills: ARRAY [
*       level: INTEGER
*       typeID: INTEGER (foreign key)
*     ]
*     time: INTEGER
*   manufacturing:
*     materials: ARRAY [
*      quantity: INTEGER
*      typeID: INTEGER (foreign key)
*     ]
*     products: ARRAY [
*       quantity: INTEGER  
*       typeID: INTEGER (foreign key)
*     ]
*     skills: ARRAY [
*       level: INTEGER
*       typeID: INTEGER (foreign key)
*     ]
*     time: INTEGER
*   research_material:
*     materials: ARRAY [
*      quantity: INTEGER
*      typeID: INTEGER (foreign key)
*     ]
*     skills: ARRAY [
*       level: INTEGER
*       typeID: INTEGER (foreign key)
*     ]
*     time: INTEGER
*   research_time:
*     materials: ARRAY [
*      quantity: INTEGER
*      typeID: INTEGER (foreign key)
*     ]
*     skills: ARRAY [
*       level: INTEGER
*       typeID: INTEGER (foreign key)
*     ]
*     time: INTEGER
*
* However, not all fields are necessary for the app so some of them
* will be omitted.
*/

export class Blueprint extends Model { }

export const blueprintModelDefine = (sequelize: Sequelize) => Blueprint.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    copying_material: DataTypes.TEXT,
    copying_skills: DataTypes.TEXT,
    copying_time: DataTypes.NUMBER,
    // manufacturing_materials:
    // manufacturing_products:
    // manufacturing_skills:
    // manufacturing_time:
    // research_material_materials:
    // research_material_
    // activities: {},copying, invention, manufacturing, research_material
    // research_time. each of these further has material, products, skills, time
    // materials and products has quantity and typeID, skills has level and typeID
    // time is just a number
    blueprint_type_id: DataTypes.INTEGER,
  },
  {
    sequelize,
    modelName: 'Blueprint',
    tableName: 'blueprints',
    timestamps: false,
  }
);