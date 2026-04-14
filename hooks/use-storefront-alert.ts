'use client';

import { useRef, useState } from 'react';

interface IStorefrontAlertState {
  id: number;
  message: string;
  description?: string;
}

export function useStorefrontAlert() {
  const nextAlertIdRef = useRef(0);
  const [alert, setAlert] = useState<IStorefrontAlertState | null>(null);

  const showSuccess = (message: string, description?: string) => {
    nextAlertIdRef.current += 1;

    setAlert({
      id: nextAlertIdRef.current,
      message,
      description,
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

  return {
    alert,
    dismissAlert,
    showSuccess,
  };
}
