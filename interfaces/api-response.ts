import { HttpStatusCode } from 'axios';

export type IApiValidationErrors =
  | string
  | string[]
  | { [key: string]: IApiValidationErrors }
  | IApiValidationErrors[];

export interface IBaseApiResponse<Data = Record<string, unknown> | null | unknown> {
  status: string;
  code: HttpStatusCode;
  success: boolean;
  message: string;
  data: Data;
  errors?: IApiValidationErrors;
}

export interface IApiCursorPagination {
  nextCursor?: string;
  previousCursor?: string;
}

export interface IApiErrorDetails {
  code?: number;
  message: string;
  validationErrors?: IApiValidationErrors;
  validationMessages: string[];
}
