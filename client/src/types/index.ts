export interface User {
  id: string;
  email: string;
  role: 'admin' | 'investor';
  fullName: string;
}

export interface Bond {
  id: string;
  isin: string;
  name: string;
  nominal: string;
  coupon_rate: string;
  issue_date: string;
  maturity_date: string;
  coupon_frequency: number;
  /** Остаток бумаг у госброкера на витрине (уменьшается при покупке, растёт при продаже клиентом) */
  available_quantity?: number;
  status: 'active' | 'inactive' | 'matured';
  ytm: string | null;
  clean_price: string | null;
  dirty_price: string | null;
  ask_price: string | null;
  bid_price: string | null;
  price_date: string | null;
  created_at: string;
}

export interface Trade {
  id: string;
  user_id: string;
  bond_id: string;
  trade_type: 'buy' | 'sell';
  quantity: number;
  price_per_bond: string;
  nkd_per_bond: string;
  total_amount: string;
  broker_margin: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  isin: string;
  bond_name: string;
  investor_name?: string;
  investor_email?: string;
}

export interface PortfolioItem {
  id: string;
  user_id: string;
  bond_id: string;
  quantity: number;
  avg_price: string;
  updated_at: string;
  isin: string;
  bond_name: string;
  nominal: string;
  coupon_rate: string;
  maturity_date: string;
  current_price: string | null;
  ytm: string | null;
}

export interface MarginReport {
  trade_date: string;
  isin: string;
  bond_name: string;
  trade_count: string;
  total_quantity: string;
  total_volume: string;
  total_margin: string;
}

export interface BalanceReport {
  full_name: string;
  email: string;
  isin: string;
  bond_name: string;
  quantity: number;
  avg_price: string;
  current_value: string;
}

export interface Summary {
  todayTrades: { count: string; volume: string };
  totalMargin: string;
  activeClients: string;
  activeBonds: string;
}
