import type { ShipmentStatus } from "../../../generated/prisma/enums";

export interface ICreateCourier {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface IAssignCourier {
  shipmentId: string;
  courierId: string;
}

export interface ICourierShipmentQuery {
  page?: number;
  limit?: number;
  status?: string;
  q?: string;
  sortOrder?: "asc" | "desc";
}

export interface IUpdateShipmentStatus {
  status: ShipmentStatus;
}
