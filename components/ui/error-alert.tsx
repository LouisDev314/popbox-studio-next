import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface IErrorAlertProps {
  className?: string;
  id?: string;
  message: string | null | undefined;
}

export function ErrorAlert({ className, id, message }: IErrorAlertProps) {
  if (!message) {
    return null;
  }

  return (
    <Alert id={id} variant="destructive" className={className}>
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
