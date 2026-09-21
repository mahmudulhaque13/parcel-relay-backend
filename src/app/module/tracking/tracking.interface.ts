export interface ITrackingResponse {
  trackingNumber: string;
  currentStatus: string;

  shipment: {
    recipientName: string;
    deliveryAddress: string;
    weight: string;
    deliveryCharge: string;
    codAmount: string;
  };

  originZone: {
    name: string;
    code: string;
  };

  destinationZone: {
    name: string;
    code: string;
  };

  timeline: Array<{
    status: string;
    description: string | null;
    location: string | null;
    createdAt: Date;
  }>;
}
