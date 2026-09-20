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
