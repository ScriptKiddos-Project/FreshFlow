import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const InventoryStats: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Inventory statistics will be implemented here.</p>
      </CardContent>
    </Card>
  );
};