// Generates a unique voucher redemption code in the style of 5StarX vouchers
// Format: 2 letters + 6 digits + 6 letters (e.g. C4403466EXUNCA)
export function generateVoucherCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // removed I and O to avoid confusion
  const digits = '0123456789';

  const prefix = Array.from({ length: 2 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  const middle = Array.from({ length: 6 }, () => digits[Math.floor(Math.random() * digits.length)]).join('');
  const suffix = Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');

  return `${prefix}${middle}${suffix}`;
}

// Default voucher expiry: 1 year from issue date
export function defaultExpiryDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

export function formatVoucherExpiry(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
