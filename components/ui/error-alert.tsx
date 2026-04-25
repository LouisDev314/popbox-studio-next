import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface IErrorAlertProps {
  className?: string;
  message: string | null | undefined;
}

export function ErrorAlert({ className, message }: IErrorAlertProps) {
  if (!message) {
    return null;
  }

  return (
    <Alert variant="destructive" className={className}>
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
