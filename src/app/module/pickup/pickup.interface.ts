export interface ICreatePickup {
  shipmentId: string;
  pickupDate: string;
  notes?: string;
}

export interface IUpdatePickupStatus {
  status: "SCHEDULED" | "PICKED_UP" | "FAILED" | "CANCELLED";
  notes?: string;
}
