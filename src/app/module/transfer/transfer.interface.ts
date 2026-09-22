export interface ICreateTransfer {
  fromHubId: string;
  toHubId: string;
}

export interface IUpdateTransferStatus {
  status: "IN_TRANSIT" | "RECEIVED" | "CANCELLED";
}
