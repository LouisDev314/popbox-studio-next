import { httpClient } from '@/api/http-client';
import { AxiosResponse } from 'axios';
import { IBaseApiResponse } from '@/interfaces/api-response';
import { ICheckoutRequest, ICheckoutSession } from '@/interfaces/checkout';
import { IOrderTicket, IGuestTicketView } from '@/interfaces/order';

const appClient = httpClient();

const MutationConfigs = {
  createCheckoutSession: (
    data: ICheckoutRequest, 
    idempotencyKey: string,
  ): Promise<AxiosResponse<IBaseApiResponse<ICheckoutSession>>> => {
    return appClient.post('/api/v1/checkout/session', data, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
  },
  revealTicket: ({
    publicId,
    ticketId,
  }: {
    publicId: string;
    ticketId: string;
  }): Promise<AxiosResponse<IBaseApiResponse<IOrderTicket>>> => {
    return appClient.post(`/api/v1/orders/${publicId}/tickets/${ticketId}/reveal`);
  },
  revealAllTickets: (publicId: string): Promise<AxiosResponse<IBaseApiResponse<IGuestTicketView>>> => {
    return appClient.post(`/api/v1/orders/${publicId}/tickets/reveal-all`);
  },
};

export default MutationConfigs;
