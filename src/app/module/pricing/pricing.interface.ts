export interface ICreatePricingRule {
  name: string;
  basePrice: number;
  perKgPrice: number;
  codPercentage: number;
}

export interface IUpdatePricingRule {
  name?: string;
  basePrice?: number;
  perKgPrice?: number;
  codPercentage?: number;
}
