/**
 * GST Calculation & Tax Engine
 */

export { INDIAN_STATES, EXPENSE_CATEGORIES } from '../types';

export interface TaxCalculationResult {
  taxableAmount: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

export function calculateItemTax(
  quantity: number,
  rate: number,
  discountPercent: number,
  discountAmount: number,
  gstRate: number,
  isInterstate: boolean
): TaxCalculationResult {
  const basePrice = quantity * rate;
  let effectiveDiscount = discountAmount;
  if (discountPercent > 0) {
    effectiveDiscount += (basePrice * discountPercent) / 100;
  }
  const taxableAmount = Math.max(0, Number((basePrice - effectiveDiscount).toFixed(2)));

  if (isInterstate) {
    const igstRate = gstRate;
    const igstAmount = Number(((taxableAmount * igstRate) / 100).toFixed(2));
    const totalTax = igstAmount;
    return {
      taxableAmount,
      cgstRate: 0,
      sgstRate: 0,
      igstRate,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount,
      totalTax,
      totalAmount: Number((taxableAmount + totalTax).toFixed(2)),
    };
  } else {
    const halfRate = Number((gstRate / 2).toFixed(2));
    const cgstAmount = Number(((taxableAmount * halfRate) / 100).toFixed(2));
    const sgstAmount = Number(((taxableAmount * halfRate) / 100).toFixed(2));
    const totalTax = Number((cgstAmount + sgstAmount).toFixed(2));
    return {
      taxableAmount,
      cgstRate: halfRate,
      sgstRate: halfRate,
      igstRate: 0,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
      totalTax,
      totalAmount: Number((taxableAmount + totalTax).toFixed(2)),
    };
  }
}

export function formatINR(val: number): string {
  const rounded = Number((val || 0).toFixed(2));
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(rounded);
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(val || 0);
}

/**
 * Converts numeric amount to Indian Currency Words (e.g., INR 12,345 -> Twelve Thousand Three Hundred Forty Five Rupees Only)
 */
export function numberToWordsINR(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return 'Zero Rupees Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n === 0) return '';
    if (n < 10) return singleDigits[n];
    if (n < 20) return teens[n - 10];
    const unit = n % 10;
    return `${tens[Math.floor(n / 10)]}${unit !== 0 ? ' ' + singleDigits[unit] : ''}`;
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) {
      res += `${singleDigits[hundred]} Hundred`;
      if (rest > 0) res += ' and ';
    }
    if (rest > 0) {
      res += convertTwoDigits(rest);
    }
    return res;
  }

  let num = rounded;
  let words = '';

  const crores = Math.floor(num / 10000000);
  num %= 10000000;

  const lakhs = Math.floor(num / 100000);
  num %= 100000;

  const thousands = Math.floor(num / 1000);
  num %= 1000;

  const hundreds = num;

  if (crores > 0) {
    words += `${convertTwoDigits(crores)} Crore `;
  }
  if (lakhs > 0) {
    words += `${convertTwoDigits(lakhs)} Lakh `;
  }
  if (thousands > 0) {
    words += `${convertTwoDigits(thousands)} Thousand `;
  }
  if (hundreds > 0) {
    words += `${convertThreeDigits(hundreds)} `;
  }

  return `${words.trim()} Rupees Only`;
}

export function validateGSTIN(gstin: string): boolean {
  if (!gstin) return true; // Optional if unregistered
  const clean = gstin.trim().toUpperCase();
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(clean);
}

export function getGSTStateCode(gstin: string): string {
  if (!gstin || gstin.length < 2) return '';
  return gstin.substring(0, 2);
}
