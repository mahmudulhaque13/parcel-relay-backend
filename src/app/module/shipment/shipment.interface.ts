import { ShipmentStatus } from "../../../generated/prisma/enums";

export interface ICreateShipment {
  originZoneId: string;
  destinationZoneId: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  packageDescription: string;
  weight: number;
  codAmount: number;
}

export interface IUpdateShipmentStatus {
  status: ShipmentStatus;
  note?: string;
  location?: string;
}
