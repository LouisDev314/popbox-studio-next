export function formatQuantity(value: number): string {
  if (value > 99) return '99+';
  return String(value);
}
