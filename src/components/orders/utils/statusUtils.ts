export const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'new':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'unpaid':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'processing':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'shipped':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};