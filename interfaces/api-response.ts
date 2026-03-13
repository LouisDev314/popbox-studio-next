import { HttpStatusCode } from 'axios';

export interface IBaseApiResponse<Data = Record<string, unknown> | null | unknown> {
  status: string;
  code: HttpStatusCode;
  success: boolean;
  message: string;
  data: Data;
}

export interface IApiCursorPagination {
  nextCursor?: string;
  previousCursor?: string;
}
