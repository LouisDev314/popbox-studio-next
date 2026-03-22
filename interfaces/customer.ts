export interface IAdminCustomer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  orderCount: number;
  totalSpentCents: number;
  createdAt: string;
}

export interface IAdminCustomerListResponse {
  items: IAdminCustomer[];
}
