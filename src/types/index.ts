export interface CompanyProfile {
  id: string;
  businessName: string;
  legalName: string;
  gstin: string;
  pan: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pinCode: string;
  logo?: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upiId: string;
  invoicePrefix: string;
  invoiceStartNumber: number;
  financialYear: string;
  roundOffEnabled: boolean;
  termsAndConditions: string;
  notes: string;
  isConfigured: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pinCode: string;
  gstin: string;
  pan: string;
  openingBalance: number;
  currentBalance: number; // Positive = Customer owes us (Debit)
  creditLimit: number;
  paymentTermsDays: number;
  createdAt: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pinCode: string;
  gstin: string;
  pan: string;
  openingBalance: number;
  currentBalance: number; // Positive = We owe supplier (Credit)
  paymentTermsDays: number;
  createdAt: string;
  notes?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  hsn: string;
  unit: string; // PCS, BOX, KG, MTR, LTR, PKT, NOS, SET
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  gstRate: number; // 0, 5, 12, 18, 28
  openingStock: number;
  currentStock: number;
  minStockAlert: number;
  maxStock: number;
  supplierId?: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID' | 'CANCELLED' | 'DRAFT';
export type PaymentMode = 'CASH' | 'BANK' | 'UPI' | 'CARD' | 'CHEQUE';

export interface SaleInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerGstin: string;
  customerState: string;
  placeOfSupply: string;
  isInterstate: boolean;
  items: InvoiceItem[];
  subtotal: number;
  itemDiscountTotal: number;
  invoiceDiscount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  balanceAmount: number;
  paymentMode: PaymentMode;
  bankAccountId?: string;
  notes?: string;
  terms?: string;
  financialYear: string;
  createdAt: string;
}

export interface PurchaseInvoice {
  id: string;
  purchaseNumber: string;
  supplierInvoiceNumber: string;
  date: string;
  dueDate: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  supplierGstin: string;
  supplierAddress: string;
  supplierState: string;
  isInterstate: boolean;
  items: InvoiceItem[];
  subtotal: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  balanceAmount: number;
  paymentMode: PaymentMode;
  bankAccountId?: string;
  notes?: string;
  financialYear: string;
  createdAt: string;
}

export type StockTransactionType =
  | 'PURCHASE'
  | 'SALE'
  | 'PURCHASE_RETURN'
  | 'SALE_RETURN'
  | 'ADJUSTMENT_ADD'
  | 'ADJUSTMENT_REMOVE'
  | 'OPENING';

export interface StockTransaction {
  id: string;
  productId: string;
  productName: string;
  date: string;
  type: StockTransactionType;
  quantity: number; // positive number
  unitPrice: number;
  referenceId?: string;
  referenceNumber?: string;
  notes?: string;
  balanceAfter: number;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  type: 'RECEIVE' | 'PAY';
  partyType: 'CUSTOMER' | 'SUPPLIER';
  partyId: string;
  partyName: string;
  amount: number;
  date: string;
  paymentMode: PaymentMode;
  referenceNo?: string;
  bankAccountId?: string;
  notes?: string;
  linkedInvoiceId?: string;
  linkedInvoiceNumber?: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  upiId?: string;
  openingBalance: number;
  currentBalance: number;
  isDefault: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  paymentMode: PaymentMode;
  bankAccountId?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface CreditDebitNote {
  id: string;
  noteNumber: string;
  noteType: 'CREDIT_NOTE' | 'DEBIT_NOTE';
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  partyType: 'CUSTOMER' | 'SUPPLIER';
  partyId: string;
  partyName: string;
  date: string;
  reason: string;
  items: InvoiceItem[];
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  createdAt: string;
}

export interface JournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  referenceType: 'SALE' | 'PURCHASE' | 'PAYMENT_RECEIVED' | 'PAYMENT_MADE' | 'EXPENSE' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'STOCK_ADJUSTMENT' | 'MANUAL';
  referenceId?: string;
  referenceNumber?: string;
  narration: string;
  lines: JournalLine[];
  createdAt: string;
}

export interface UserAccount {
  id: string;
  username: string;
  role: 'ADMIN' | 'STAFF';
  fullName: string;
  pin: string; // 4-digit PIN for simple secure local access
  permissions: {
    sales: boolean;
    purchases: boolean;
    inventory: boolean;
    customers: boolean;
    suppliers: boolean;
    accounts: boolean;
    reports: boolean;
    settings: boolean;
  };
}

export interface IndianState {
  code: string;
  name: string;
}

export const INDIAN_STATES: IndianState[] = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh (New)' },
  { code: '38', name: 'Ladakh' },
];

export const EXPENSE_CATEGORIES = [
  'Office Rent',
  'Electricity & Utilities',
  'Employee Salaries',
  'Transport & Freight',
  'Marketing & Advertising',
  'Tea & Refreshments',
  'Repairs & Maintenance',
  'Packaging Material',
  'Stationery & Printing',
  'Bank Charges & Fees',
  'Software & Subscriptions',
  'Miscellaneous Expenses',
];
