export type MaterialsType = {
  [typeId: number]: {
    quantity: number,
    runs: number,
    leftover: number,
  }
};

/**
 * Class for maintaining the number of runs, used materials and leftover
 * materials during the manufacturing tree traversal.
 */
export class MaterialPlan {

  public materials: MaterialsType;

  constructor(
    assets: { [typeId: number]: number },   // typeId -> quantity
  ) {
    this.materials = {};
    // Initialize leftover with existing assets
    Object.entries(assets).forEach(a => this.addLeftover(Number(a[0]), a[1]));
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
}