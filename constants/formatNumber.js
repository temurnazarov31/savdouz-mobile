export const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)} mlrd`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)} mln`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)} ming`;
  return num.toLocaleString();
};

export const formatPrice = (num) => `${formatNumber(num)} UZS`;