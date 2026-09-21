export interface ICreateTransfer {
  shipmentId: string;
  fromHubId: string;
  toHubId: string;
}

export interface IUpdateTransferStatus {
  status: "IN_TRANSIT" | "RECEIVED" | "CANCELLED";
}
