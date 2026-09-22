export interface IReassignCourier {
  courierId: string;
}

export interface IAdminUserQuery {
  page?: number;
  limit?: number;
  role?: 'CUSTOMER' | 'COURIER' | 'ADMIN';
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'DELETED';
  q?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IUpdateUserRole {
  role: 'CUSTOMER' | 'COURIER' | 'ADMIN';
  phone?: string;
}

export interface IUpdateUserStatus {
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'DELETED';
}

export interface IAuditLogQuery {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  userId?: string;
  q?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IShipmentReportQuery {
  page?: number;
  limit?: number;
  status?:
    | 'PENDING_PAYMENT'
    | 'READY_FOR_ASSIGNMENT'
    | 'ASSIGNED'
    | 'PICKUP_SCHEDULED'
    | 'PICKED_UP'
    | 'AT_ORIGIN_HUB'
    | 'IN_TRANSIT'
    | 'AT_DESTINATION_HUB'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERY_FAILED'
    | 'RETURN_INITIATED'
    | 'RETURN_IN_TRANSIT'
    | 'DELIVERED'
    | 'RETURNED_TO_SENDER'
    | 'CANCELLED';
  originZoneId?: string;
  destinationZoneId?: string;
  q?: string;
  sortBy?: 'createdAt' | 'deliveryCharge' | 'weight';
  sortOrder?: 'asc' | 'desc';
}
