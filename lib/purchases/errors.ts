export class PurchaseError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}
