import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AddInventoryDialogProps {
  open: boolean;
  onClose: () => void;
}

export const AddInventoryDialog: React.FC<AddInventoryDialogProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Ingredient</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p className="text-gray-600">Add inventory form will be implemented here.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};