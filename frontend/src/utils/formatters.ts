export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getDaysUntilExpiry = (expiryDate: string | Date): number => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const formatExpiryDate = (expiryDate: string | Date) => {
  const daysLeft = getDaysUntilExpiry(expiryDate);
  
  return {
    formatted: formatDate(expiryDate),
    daysLeft,
    urgency: daysLeft < 0 ? 'expired' : daysLeft <= 1 ? 'critical' : daysLeft <= 3 ? 'warning' : 'normal',
    color: daysLeft < 0 ? 'text-red-600' : daysLeft <= 1 ? 'text-red-500' : daysLeft <= 3 ? 'text-orange-500' : 'text-green-600'
  };
};