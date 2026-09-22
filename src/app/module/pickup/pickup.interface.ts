export interface ICreatePickup {
  pickupDate: string;
  notes?: string;
}

export interface IUpdatePickupStatus {
  status: 'SCHEDULED' | 'PICKED_UP' | 'FAILED' | 'CANCELLED';
  notes?: string;
}
