export interface EveSdeType {
  id: number,
  name: string,
  group_id: number,
  meta_group_id: number,
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

export interface EveSdeBlueprint {
  id: number,
  copying_time: number,
  invention_time: number,
  manufacturing_time: number,
  research_material_time: number,
  research_time_time: number,
  reaction_time: number,
}