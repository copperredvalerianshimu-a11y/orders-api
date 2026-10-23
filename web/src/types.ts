export interface Customer {
  id: number;
  name: string;
  email: string;
  country: string;
  created_at: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  qty: number;
  unit_price_cents: number;
}

export interface Order {
  id: number;
  status: string;
  created_at: string;
  total_cents: number;
  customer: Customer | null;
  items: OrderItem[];
}

export interface OrdersApiResponse {
  data: Order[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}