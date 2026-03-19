import React, { useState, useEffect } from 'react';
import { Plus, Package, AlertTriangle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryList } from './InventoryList';
import { AddInventoryDialog } from './AddInventoryDialog';
import { InventoryStats } from './InventoryStats';
import { useInventoryStore } from '@/store/inventoryStore';

export const InventoryManager: React.FC = () => {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const store = useInventoryStore();

  const ingredients = store.ingredients ?? [];
  const loading = store.loading ?? false;
  const totalValue = store.getTotalValue();
  const expiringCount = store.getExpiringIngredients(3).length;
  const lowStockCount = ingredients.filter(
    ing => ing.minStockLevel !== undefined && ing.quantity <= ing.minStockLevel
  ).length;

  // If you don't have fetchInventory in store, remove this effect or implement it
  useEffect(() => {
    if (typeof (store as any).fetchInventory === 'function') {
      (store as any).fetchInventory();
    }
  }, [store]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Track and manage your ingredient stock</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Ingredient
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ingredients.length}</div>
            <p className="text-xs text-muted-foreground">Active inventory items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current stock value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{expiringCount}</div>
            <p className="text-xs text-muted-foreground">Items expiring in 3 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Items below minimum threshold</p>
          </CardContent>
        </Card>
      </div>

      <InventoryStats />

      <InventoryList loading={loading} />

      <AddInventoryDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
      />
    </div>
  );
};
