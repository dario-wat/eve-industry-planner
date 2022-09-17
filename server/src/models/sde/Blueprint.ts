import { Sequelize, DataTypes, Model } from 'sequelize';

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
*   reaction:
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
*
* However, not all fields are necessary for the app so some of them
* will be omitted.
*/

export class Blueprint extends Model {
}

export const blueprintModelDefine = (sequelize: Sequelize) => Blueprint.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    copying_time: DataTypes.INTEGER,
    invention_time: DataTypes.INTEGER,
    manufacturing_time: DataTypes.INTEGER,
    research_material_time: DataTypes.INTEGER,
    research_time_time: DataTypes.INTEGER,
    reaction_time: DataTypes.INTEGER,
  },
  {
    sequelize,
    modelName: Blueprint.name,
    tableName: 'blueprints',
    timestamps: false,
  }
);

export class BpCopyingMaterials extends Model {
}

export const bpCopyingMaterialsDefine =
  (sequelize: Sequelize) => BpCopyingMaterials.init(
    {
      blueprint_id: DataTypes.INTEGER,
      type_id: DataTypes.INTEGER,
      quantity: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: BpCopyingMaterials.name,
      tableName: 'bp_copying_materials',
      timestamps: false,
    }
  );

export class BpInventionMaterials extends Model {
}

export const bpInventionMaterialsDefine =
  (sequelize: Sequelize) => BpInventionMaterials.init(
    {
      blueprint_id: DataTypes.INTEGER,
      type_id: DataTypes.INTEGER,
      quantity: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: BpInventionMaterials.name,
      tableName: 'bp_invention_materials',
      timestamps: false,
    }
  );

export class BpManufacturingMaterials extends Model {
}

export const bpManufacturingMaterialsDefine =
  (sequelize: Sequelize) => BpManufacturingMaterials.init(
    {
      blueprint_id: DataTypes.INTEGER,
      type_id: DataTypes.INTEGER,
      quantity: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: BpManufacturingMaterials.name,
      tableName: 'bp_manufacturing_materials',
      timestamps: false,
    }
  );

export class BpMeMaterials extends Model {
}

export const bpMeMaterialsDefine =
  (sequelize: Sequelize) => BpMeMaterials.init(
    {
      blueprint_id: DataTypes.INTEGER,
      type_id: DataTypes.INTEGER,
      quantity: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: BpMeMaterials.name,
      tableName: 'bp_me_materials',
      timestamps: false,
    }
  );

export class BpTeMaterials extends Model {
}

export const bpTeMaterialsDefine =
  (sequelize: Sequelize) => BpTeMaterials.init(
    {
      blueprint_id: DataTypes.INTEGER,
      type_id: DataTypes.INTEGER,
      quantity: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: BpTeMaterials.name,
      tableName: 'bp_te_materials',
      timestamps: false,
    }
  );

export class BpReactionMaterials extends Model {
}

export const bpReactionMaterialsDefine =
  (sequelize: Sequelize) => BpReactionMaterials.init(
    {
      blueprint_id: DataTypes.INTEGER,
      type_id: DataTypes.INTEGER,
      quantity: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: BpReactionMaterials.name,
      tableName: 'bp_reaction_materials',
      timestamps: false,
    }
  );

export class BpInventionProducts extends Model {
}

export const bpInventionProductsDefine =
  (sequelize: Sequelize) => BpInventionProducts.init(
    {
      blueprint_id: DataTypes.INTEGER,
      type_id: DataTypes.INTEGER,
      quantity: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: BpInventionProducts.name,
      tableName: 'bp_invention_products',
      timestamps: false,
    }
  );

export class BpManufacturingProducts extends Model {
}

export const bpManufacturingProductsDefine =
  (sequelize: Sequelize) => BpManufacturingProducts.init(
    {
      blueprint_id: DataTypes.INTEGER,
      type_id: DataTypes.INTEGER,
      quantity: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: BpManufacturingProducts.name,
      tableName: 'bp_manufacturing_products',
      timestamps: false,
    }
  );

export class BpReactionProducts extends Model {
}

export const bpReactionProductsDefine =
  (sequelize: Sequelize) => BpReactionProducts.init(
    {
      blueprint_id: DataTypes.INTEGER,
      type_id: DataTypes.INTEGER,
      quantity: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: BpReactionProducts.name,
      tableName: 'bp_reaction_products',
      timestamps: false,
    }
  );