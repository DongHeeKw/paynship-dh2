export interface HomeOrder {
  id: string; category: string; destination: string; quantity: number;
  status: string; statusLabel: string; action: string; needsAttention: boolean;
  updatedAt: string; lastEventAt: string | null;
}
export interface HomeOrders {
  activeCount: number; attentionCount: number; orders: HomeOrder[];
}
