export interface IReassignCourier {
  courierId: string;
}

export interface IAdminUserQuery {
  page?: number;
  limit?: number;
  role?: "CUSTOMER" | "COURIER" | "ADMIN";
  status?: "ACTIVE" | "INACTIVE" | "BLOCKED" | "DELETED";
  q?: string;
  sortOrder?: "asc" | "desc";
}

export interface IUpdateUserRole {
  role: "CUSTOMER" | "COURIER" | "ADMIN";
  phone?: string;
}
