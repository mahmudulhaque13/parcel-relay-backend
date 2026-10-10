import type { ShipmentStatus } from "../../../generated/prisma/client";

export interface ITrackingResponse {
  trackingNumber: string;
  currentStatus: ShipmentStatus;

  originZone: {
    name: string;
    code: string;
  };

  destinationZone: {
    name: string;
    code: string;
  };

  timeline: {
    status: ShipmentStatus;
    description: string | null;
    location: string | null;
    createdAt: Date;
  }[];
}
