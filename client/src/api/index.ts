import api from './axios';
import type { Bond, Trade, PortfolioItem, MarginReport, BalanceReport, Summary, User } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }),
};

export const bondsApi = {
  list: () => api.get<Bond[]>('/bonds'),
  get: (id: string) => api.get<Bond>(`/bonds/${id}`),
  create: (data: { isin: string; name: string; nominal: number; couponRate: number; issueDate: string; maturityDate: string; couponFrequency: number }) =>
    api.post<Bond>('/bonds', data),
  update: (id: string, data: Partial<Bond>) => api.put<Bond>(`/bonds/${id}`, data),
  updateYtm: (id: string, ytm: number) => api.put<Bond>(`/bonds/${id}/ytm`, { ytm }),
  deactivate: (id: string) => api.delete(`/bonds/${id}`),
};

export const tradesApi = {
  list: () => api.get<Trade[]>('/trades'),
  create: (bondId: string, tradeType: 'buy' | 'sell', quantity: number) =>
    api.post<Trade>('/trades', { bondId, tradeType, quantity }),
};

export const portfolioApi = {
  list: () => api.get<PortfolioItem[]>('/portfolio'),
};

export const reportsApi = {
  margin: (from?: string, to?: string) =>
    api.get<MarginReport[]>('/reports/margin', { params: { from, to } }),
  balances: () => api.get<BalanceReport[]>('/reports/balances'),
  summary: () => api.get<Summary>('/reports/summary'),
};
