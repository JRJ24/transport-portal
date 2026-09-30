export const dispatchKeys = {
  candidates: (orderId: string) => ["dispatch", "candidates", orderId] as const,
  offers: (orderId: string) => ["dispatch", "offers", orderId] as const,
};
