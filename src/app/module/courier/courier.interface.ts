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
