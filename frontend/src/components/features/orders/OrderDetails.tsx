import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOrderStore } from '@/store/orderStore';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface OrderDetailsProps {
  orderId: string;
  onClose: () => void;
}

export const OrderDetails: React.FC<OrderDetailsProps> = ({ orderId, onClose }) => {
  const { getOrderById } = useOrderStore();
  const order = getOrderById(orderId);

  if (!order) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Order not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Order Details
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium">Order #{order.orderNumber}</h4>
          <p className="text-sm text-gray-600">{formatDate(order.createdAt)}</p>
        </div>

        <div>
          <h4 className="font-medium">Customer</h4>
          <p className="text-sm">{order.buyerName}</p>
          <p className="text-sm text-gray-600">{order.buyerPhone}</p>
        </div>

        <div>
          <h4 className="font-medium">Items</h4>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item._id} className="flex justify-between text-sm">
                <span>{item.ingredientName} ({item.quantity.ordered} {item.quantity.unit})</span>
                <span>{formatCurrency(item.pricing.totalPrice)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-2">
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>{formatCurrency(order.pricing.total)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" className="flex-1">
            Update Status
          </Button>
          <Button variant="outline" size="sm">
            Contact
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};