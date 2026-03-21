import { Dispatch, SetStateAction } from 'react';
import { productStatus, productType } from '@/interfaces/product';

type StateAction = {
  name: string;
  description: string;
  productType: productType;
  status: productStatus;
  priceStr: string;
  sku: string;
  collectionId: string;
  tagIds: string[];
  onHand: string;
  lowStockThreshold: string;
};

export const handleNumericInputChange = (
  key: 'onHand' | 'lowStockThreshold',
  value: string,
  setFormData: Dispatch<SetStateAction<StateAction>>,
) => {
  if (!/^\d*$/.test(value)) return;

  setFormData((prev) => ({
    ...prev,
    [key]: value,
  }));
};
