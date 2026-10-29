export interface ProofOfDelivery {
  id: string;
  stopId: string;
  capturedAt: string;
}

/** Sensitive media; transport only to the region-scoped Dispatch endpoint. */
export interface ProofOfDeliveryUpload {
  photoBase64: string;
  signatureBase64: string;
  capturedAt: string;
}
