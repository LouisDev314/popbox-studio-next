'use client';

import { createContext, type ReactNode, useRef, useState } from 'react';
import { StorefrontSuccessAlert } from '@/components/ui/storefront-success-alert';

type TStorefrontAlertVariant = 'success' | 'warning';

export interface IStorefrontAlertState {
  id: number;
  message: string;
  description?: string;
  variant?: TStorefrontAlertVariant;
}

export interface IStorefrontAlertContextValue {
  alert: IStorefrontAlertState | null;
  dismissAlert: (id?: number) => void;
  showSuccess: (message: string, description?: string, variant?: TStorefrontAlertVariant) => void;
}

export const StorefrontAlertContext = createContext<IStorefrontAlertContextValue | null>(null);

interface IStorefrontAlertProviderProps {
  children: ReactNode;
}

export function StorefrontAlertProvider(props: IStorefrontAlertProviderProps) {
  const { children } = props;
  const nextAlertIdRef = useRef(0);
  const [alert, setAlert] = useState<IStorefrontAlertState | null>(null);

  const showSuccess = (
    message: string,
    description?: string,
    variant: TStorefrontAlertVariant = 'success',
  ) => {
    nextAlertIdRef.current += 1;

    setAlert({
      id: nextAlertIdRef.current,
      message,
      description,
      variant,
    });
  };

  const dismissAlert = (id?: number) => {
    setAlert((currentAlert) => {
      if (!currentAlert) {
        return null;
      }

      if (id !== undefined && currentAlert.id !== id) {
        return currentAlert;
      }

      return null;
    });
  };

  return (
    <StorefrontAlertContext.Provider
      value={{
        alert,
        dismissAlert,
        showSuccess,
      }}
    >
      {children}
      {alert ? (
        <StorefrontSuccessAlert
          alertId={alert.id}
          message={alert.message}
          description={alert.description}
          variant={alert.variant}
          onDismiss={dismissAlert}
        />
      ) : null}
    </StorefrontAlertContext.Provider>
  );
}
