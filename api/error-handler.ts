import { AxiosError, HttpStatusCode } from 'axios';

interface IErrorHandlerArgs {
  code: string;
  title: string;
  msg: string;
}

export const networkErrorHandler = (error: AxiosError) => {
  const { response } = error;
  const status = response?.status;
  switch (status) {
    case HttpStatusCode.InternalServerError:
      // toggleErrorPopup({ errorMessage: 'error.common.10000' });
      break;
    default:
      break;
  }
};

export const serverErrorHandler = ({ code, title, msg = '' }: IErrorHandlerArgs, handleOnClose?: () => void) => {

};
