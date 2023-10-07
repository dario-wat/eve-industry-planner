/** 
 * Represents data for a single material. This can be either a product
 * that can be built (e.g. Caracal) or a raw materials (e.g. Tritanium).
 */
type MaterialsData = {
  /** Quantity needed to buy. */
  quantity: number,
  /** Blueprint runs. */
  runs: number,
  /** Leftover after the production. */
  leftover: number,
}

export type MaterialsList = ({ typeId: number } & MaterialsData)[];

/**
 * Class for maintaining the number of runs, used materials and leftover
 * materials during the manufacturing tree traversal.
 */
export class MaterialPlan {

  /** typeId -> MaterialsData */
  private materials: Record<number, MaterialsData>;

  constructor(
    assets: Record<number, number>,   // typeId -> quantity
  ) {
    this.materials = {};
    // Initialize leftover with existing assets
    Object.entries(assets).forEach(([typeId, assetQuantity]) =>
      this.addLeftover(Number(typeId), assetQuantity)
    );
  }

  public addQuantity(typeId: number, quantity: number): void {
    if (typeId in this.materials) {
      this.materials[typeId].quantity += quantity;
    } else {
      this.materials[typeId] = { quantity, runs: 0, leftover: 0 };
    }
  }

  public addRuns(typeId: number, runs: number): void {
    if (typeId in this.materials) {
      this.materials[typeId].runs += runs;
    } else {
      this.materials[typeId] = { quantity: 0, runs, leftover: 0 };
    }
  }

  public addLeftover(typeId: number, leftover: number): void {
    if (typeId in this.materials) {
      this.materials[typeId].leftover += leftover;
    } else {
      this.materials[typeId] = { quantity: 0, runs: 0, leftover };
    }
  }

  /**
   * Subtracts the quantity from leftover
   * @returns the amount subtracted
   */
  public subtractLeftover(typeId: number, quantity: number): number {
    if (typeId in this.materials) {
      const stockQuantity = Math.min(
        this.materials[typeId].leftover,
        quantity,
      );
      this.materials[typeId].leftover -= stockQuantity;
      return stockQuantity;
    }
    return 0;
  }

  public getMaterialsList(): MaterialsList {
    return Object.entries(this.materials).map(([typeIdStr, materialsData]) => ({
      typeId: Number(typeIdStr),
      ...materialsData,
    }));
  }
}