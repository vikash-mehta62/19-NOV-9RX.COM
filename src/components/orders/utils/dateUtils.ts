export const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "Invalid Date";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
};

export const getOrderDate = (order: { date?: string }) => {
  if (order.date) {
    return formatDate(order.date);
  }
  return formatDate(new Date().toISOString());
};