export interface ICreateHub {
  name: string;
  code: string;
  address: string;
  zoneId: string;
}

export interface IUpdateHub {
  name?: string;
  code?: string;
  address?: string;
  zoneId?: string;
}
