'use client';

import { IKujiPrize } from '@/interfaces/product';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { EditKujiPrizeForm } from './edit-kuji-prize-form';

type EditKujiPrizeNotification = {
  type: 'success' | 'error';
  message: string;
};

interface IEditKujiPrizeModalProps {
  open: boolean;
  prize: IKujiPrize | null;
  productId: string;
  onOpenChange: (open: boolean) => void;
  onNotify: (notification: EditKujiPrizeNotification) => void;
}

export function EditKujiPrizeModal({
  open,
  prize,
  productId,
  onOpenChange,
  onNotify,
}: IEditKujiPrizeModalProps) {
  if (!prize) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100vw-1.5rem),52rem)] rounded-3xl p-0">
        <div className="max-h-[calc(100vh-1.5rem)] overflow-y-auto p-6 sm:p-8">
          <DialogHeader className="mb-6 pr-12">
            <DialogTitle className="text-xl font-semibold text-[#191C1E]">
              Edit Prize {prize.prizeCode}
            </DialogTitle>
            <DialogDescription>
              Update prize details, stock counts, and display order. Changes refresh from the backend after save.
            </DialogDescription>
          </DialogHeader>

          <EditKujiPrizeForm
            key={prize.id}
            productId={productId}
            prize={prize}
            onCancel={() => onOpenChange(false)}
            onSuccess={() => onOpenChange(false)}
            onNotify={onNotify}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
