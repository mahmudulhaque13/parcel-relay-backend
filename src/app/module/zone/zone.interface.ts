export interface ICreateZone {
  name: string;
  code: string;
  description?: string;
}

export interface IUpdateZone {
  name?: string;
  code?: string;
  description?: string;
}
