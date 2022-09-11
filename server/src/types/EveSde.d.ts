export interface EveSdeType {
  id: number,
  name: string,
  group_id: number,
}

export interface EveSdeGroup {
  id: number,
  name: string,
  category_id: number,
}

export interface EveSdeStation {
  id: number,
  name: string,
}

export interface EveSdeBlueprintMaterial {
  blueprint_id: number,
  type_id: number,
  quantity: number,
}

/*
  Type for Product ->  Materials would look like this:

  export interface EveSdeItemMaterials {
    type_id: number,
    quantity: number,
    materials: {
      type_id: number,
      quantity: number,
    }[],
  }
*/