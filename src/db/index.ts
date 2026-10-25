import Dexie, { type Table } from 'dexie';
import type {
  CompanyProfile,
  Customer,
  Supplier,
  Product,
  SaleInvoice,
  PurchaseInvoice,
  StockTransaction,
  PaymentRecord,
  BankAccount,
  Expense,
  CreditDebitNote,
  JournalEntry,
  UserAccount,
  InvoiceItem,
} from '../types';

export class BharatLedgerDB extends Dexie {
  company!: Table<CompanyProfile, string>;
  customers!: Table<Customer, string>;
  suppliers!: Table<Supplier, string>;
  products!: Table<Product, string>;
  sales!: Table<SaleInvoice, string>;
  purchases!: Table<PurchaseInvoice, string>;
  stockTransactions!: Table<StockTransaction, string>;
  payments!: Table<PaymentRecord, string>;
  bankAccounts!: Table<BankAccount, string>;
  expenses!: Table<Expense, string>;
  creditDebitNotes!: Table<CreditDebitNote, string>;
  journalEntries!: Table<JournalEntry, string>;
  userAccounts!: Table<UserAccount, string>;

  constructor() {
    super('BharatLedgerDatabase');
    this.version(1).stores({
      company: 'id',
      customers: 'id, name, phone, gstin, currentBalance, createdAt',
      suppliers: 'id, name, phone, gstin, currentBalance, createdAt',
      products: 'id, name, sku, barcode, category, hsn, currentStock, minStockAlert, createdAt',
      sales: 'id, invoiceNumber, date, customerId, paymentStatus, financialYear, createdAt',
      purchases: 'id, purchaseNumber, supplierInvoiceNumber, date, supplierId, paymentStatus, financialYear, createdAt',
      stockTransactions: 'id, productId, date, type, referenceId, referenceNumber, createdAt',
      payments: 'id, type, partyId, partyType, date, paymentMode, linkedInvoiceId, createdAt',
      bankAccounts: 'id, bankName, accountNumber, currentBalance, isDefault',
      expenses: 'id, category, date, amount, paymentMode, createdAt',
      creditDebitNotes: 'id, noteNumber, noteType, originalInvoiceId, partyId, date, createdAt',
      journalEntries: 'id, date, referenceType, referenceNumber, createdAt',
      userAccounts: 'id, username, role',
    });
  }
}

export const db = new BharatLedgerDB();

export const DEFAULT_COMPANY: CompanyProfile = {
  id: 'default',
  businessName: '',
  legalName: '',
  gstin: '',
  pan: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: 'Maharashtra',
  stateCode: '27',
  pinCode: '',
  bankName: '',
  accountNumber: '',
  ifsc: '',
  branch: '',
  upiId: '',
  invoicePrefix: 'INV-2627-',
  invoiceStartNumber: 1,
  financialYear: '2026-27',
  roundOffEnabled: true,
  termsAndConditions: '1. Goods once sold will be replaced only under warranty terms.\n2. Interest @18% p.a. will be charged on overdue payments.\n3. Subject to local jurisdiction only.',
  notes: 'Thank you for your business!',
  isConfigured: false,
};

export const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'bank-cash',
    bankName: 'Cash In Hand',
    accountName: 'Main Cash Drawer',
    accountNumber: 'CASH-01',
    ifsc: 'NA',
    openingBalance: 0,
    currentBalance: 0,
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bank-primary',
    bankName: 'Bank Current Account',
    accountName: 'Operating Account',
    accountNumber: '',
    ifsc: '',
    upiId: '',
    openingBalance: 0,
    currentBalance: 0,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
];

// Helper to seed initial setup if database is completely fresh
export async function initializeDatabase() {
  const comp = await db.company.get('default');
  if (!comp) {
    await db.company.put(DEFAULT_COMPANY);
  }
  const bankCount = await db.bankAccounts.count();
  if (bankCount === 0) {
    for (const b of DEFAULT_BANK_ACCOUNTS) {
      await db.bankAccounts.put(b);
    }
  }
  const userCount = await db.userAccounts.count();
  if (userCount === 0) {
    await db.userAccounts.put({
      id: 'admin-01',
      username: 'admin',
      fullName: 'Owner / Administrator',
      role: 'ADMIN',
      pin: '1234',
      permissions: {
        sales: true,
        purchases: true,
        inventory: true,
        customers: true,
        suppliers: true,
        accounts: true,
        reports: true,
        settings: true,
      },
    });
  }
}

// Transaction Safe: Save Sale Invoice
export async function saveSaleInvoice(invoice: SaleInvoice): Promise<void> {
  await db.transaction(
    'rw',
    [db.sales, db.customers, db.products, db.stockTransactions, db.bankAccounts, db.payments, db.journalEntries],
    async () => {
      // 1. Check existing
      const existing = await db.sales.get(invoice.id);
      if (existing) {
        throw new Error(`Invoice #${invoice.invoiceNumber} already exists.`);
      }

      // 2. Insert invoice
      await db.sales.add(invoice);

      // 3. Update customer balance (+ balanceAmount unpaid)
      const customer = await db.customers.get(invoice.customerId);
      if (customer) {
        const newBalance = Number((customer.currentBalance + invoice.balanceAmount).toFixed(2));
        await db.customers.update(customer.id, { currentBalance: newBalance });
      }

      // 4. Update stock and stock ledger for each item
      for (const item of invoice.items) {
        const product = await db.products.get(item.productId);
        if (product) {
          const newStock = Number((product.currentStock - item.quantity).toFixed(2));
          await db.products.update(product.id, { currentStock: newStock });

          const stockTx: StockTransaction = {
            id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            productId: product.id,
            productName: product.name,
            date: invoice.date,
            type: 'SALE',
            quantity: item.quantity,
            unitPrice: item.rate,
            referenceId: invoice.id,
            referenceNumber: invoice.invoiceNumber,
            notes: `Sold to ${invoice.customerName}`,
            balanceAfter: newStock,
            createdAt: new Date().toISOString(),
          };
          await db.stockTransactions.add(stockTx);
        }
      }

      // 5. If immediate payment was received
      if (invoice.paidAmount > 0) {
        const paymentRecord: PaymentRecord = {
          id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'RECEIVE',
          partyType: 'CUSTOMER',
          partyId: invoice.customerId,
          partyName: invoice.customerName,
          amount: invoice.paidAmount,
          date: invoice.date,
          paymentMode: invoice.paymentMode,
          bankAccountId: invoice.bankAccountId,
          linkedInvoiceId: invoice.id,
          linkedInvoiceNumber: invoice.invoiceNumber,
          notes: `Payment for Sale Invoice #${invoice.invoiceNumber}`,
          createdAt: new Date().toISOString(),
        };
        await db.payments.add(paymentRecord);

        if (invoice.bankAccountId) {
          const bank = await db.bankAccounts.get(invoice.bankAccountId);
          if (bank) {
            await db.bankAccounts.update(bank.id, {
              currentBalance: Number((bank.currentBalance + invoice.paidAmount).toFixed(2)),
            });
          }
        }
      }

      // 6. Double-entry Journal Entry underneath
      const journalLines = [
        {
          accountCode: '4001',
          accountName: 'Sales Revenue',
          debit: 0,
          credit: invoice.taxableAmount,
        },
      ];

      if (invoice.isInterstate) {
        if (invoice.igstTotal > 0) {
          journalLines.push({
            accountCode: '2103',
            accountName: 'Output IGST Payable',
            debit: 0,
            credit: invoice.igstTotal,
          });
        }
      } else {
        if (invoice.cgstTotal > 0) {
          journalLines.push({
            accountCode: '2101',
            accountName: 'Output CGST Payable',
            debit: 0,
            credit: invoice.cgstTotal,
          });
        }
        if (invoice.sgstTotal > 0) {
          journalLines.push({
            accountCode: '2102',
            accountName: 'Output SGST Payable',
            debit: 0,
            credit: invoice.sgstTotal,
          });
        }
      }

      if (invoice.paidAmount > 0) {
        journalLines.push({
          accountCode: invoice.paymentMode === 'CASH' ? '1001' : '1002',
          accountName: invoice.paymentMode === 'CASH' ? 'Cash in Hand' : 'Bank Account',
          debit: invoice.paidAmount,
          credit: 0,
        });
      }

      if (invoice.balanceAmount > 0) {
        journalLines.push({
          accountCode: '1100',
          accountName: `Accounts Receivable (${invoice.customerName})`,
          debit: invoice.balanceAmount,
          credit: 0,
        });
      }

      const journalEntry: JournalEntry = {
        id: `je-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: invoice.date,
        referenceType: 'SALE',
        referenceId: invoice.id,
        referenceNumber: invoice.invoiceNumber,
        narration: `Sale to ${invoice.customerName} via Invoice #${invoice.invoiceNumber}`,
        lines: journalLines,
        createdAt: new Date().toISOString(),
      };

      await db.journalEntries.add(journalEntry);
    }
  );
}

// Transaction Safe: Cancel Sale Invoice (Reversing accounting, ledger, and inventory effects)
export async function cancelSaleInvoice(invoiceId: string, reason: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.sales, db.customers, db.products, db.stockTransactions, db.bankAccounts, db.journalEntries],
    async () => {
      const inv = await db.sales.get(invoiceId);
      if (!inv) throw new Error('Invoice not found');
      if (inv.paymentStatus === 'CANCELLED') throw new Error('Invoice is already cancelled');

      // 1. Mark as cancelled
      await db.sales.update(invoiceId, {
        paymentStatus: 'CANCELLED',
        notes: `${inv.notes || ''} [CANCELLED: ${reason}]`.trim(),
      });

      // 2. Revert customer balance
      if (inv.balanceAmount > 0) {
        const customer = await db.customers.get(inv.customerId);
        if (customer) {
          const newBalance = Number((customer.currentBalance - inv.balanceAmount).toFixed(2));
          await db.customers.update(customer.id, { currentBalance: newBalance });
        }
      }

      // 3. Revert payment if paid amount was deposited
      if (inv.paidAmount > 0 && inv.bankAccountId) {
        const bank = await db.bankAccounts.get(inv.bankAccountId);
        if (bank) {
          await db.bankAccounts.update(bank.id, {
            currentBalance: Number((bank.currentBalance - inv.paidAmount).toFixed(2)),
          });
        }
      }

      // 4. Return items back to stock
      for (const item of inv.items) {
        const product = await db.products.get(item.productId);
        if (product) {
          const newStock = Number((product.currentStock + item.quantity).toFixed(2));
          await db.products.update(product.id, { currentStock: newStock });

          const stockTx: StockTransaction = {
            id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            productId: product.id,
            productName: product.name,
            date: new Date().toISOString().slice(0, 10),
            type: 'SALE_RETURN',
            quantity: item.quantity,
            unitPrice: item.rate,
            referenceId: inv.id,
            referenceNumber: inv.invoiceNumber,
            notes: `Reversal on Cancellation of Invoice #${inv.invoiceNumber}: ${reason}`,
            balanceAfter: newStock,
            createdAt: new Date().toISOString(),
          };
          await db.stockTransactions.add(stockTx);
        }
      }

      // 5. Reversal journal entry
      const reversalJournal: JournalEntry = {
        id: `je-rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: new Date().toISOString().slice(0, 10),
        referenceType: 'SALE',
        referenceId: inv.id,
        referenceNumber: inv.invoiceNumber,
        narration: `Cancellation Reversal for Sale #${inv.invoiceNumber} - Reason: ${reason}`,
        lines: [
          {
            accountCode: '4001',
            accountName: 'Sales Revenue (Reversal)',
            debit: inv.taxableAmount,
            credit: 0,
          },
          ...(inv.isInterstate
            ? [
                {
                  accountCode: '2103',
                  accountName: 'Output IGST Reversal',
                  debit: inv.igstTotal,
                  credit: 0,
                },
              ]
            : [
                {
                  accountCode: '2101',
                  accountName: 'Output CGST Reversal',
                  debit: inv.cgstTotal,
                  credit: 0,
                },
                {
                  accountCode: '2102',
                  accountName: 'Output SGST Reversal',
                  debit: inv.sgstTotal,
                  credit: 0,
                },
              ]),
          ...(inv.paidAmount > 0
            ? [
                {
                  accountCode: inv.paymentMode === 'CASH' ? '1001' : '1002',
                  accountName: inv.paymentMode === 'CASH' ? 'Cash in Hand (Reversal)' : 'Bank Account (Reversal)',
                  debit: 0,
                  credit: inv.paidAmount,
                },
              ]
            : []),
          ...(inv.balanceAmount > 0
            ? [
                {
                  accountCode: '1100',
                  accountName: `Accounts Receivable Reversal (${inv.customerName})`,
                  debit: 0,
                  credit: inv.balanceAmount,
                },
              ]
            : []),
        ],
        createdAt: new Date().toISOString(),
      };
      await db.journalEntries.add(reversalJournal);
    }
  );
}

// Transaction Safe: Save Purchase Invoice
export async function savePurchaseInvoice(purchase: PurchaseInvoice): Promise<void> {
  await db.transaction(
    'rw',
    [db.purchases, db.suppliers, db.products, db.stockTransactions, db.bankAccounts, db.payments, db.journalEntries],
    async () => {
      await db.purchases.add(purchase);

      // 1. Update supplier payable balance (+ balanceAmount unpaid)
      const supplier = await db.suppliers.get(purchase.supplierId);
      if (supplier) {
        const newBalance = Number((supplier.currentBalance + purchase.balanceAmount).toFixed(2));
        await db.suppliers.update(supplier.id, { currentBalance: newBalance });
      }

      // 2. Increase stock and log transaction
      for (const item of purchase.items) {
        const product = await db.products.get(item.productId);
        if (product) {
          const newStock = Number((product.currentStock + item.quantity).toFixed(2));
          await db.products.update(product.id, {
            currentStock: newStock,
            purchasePrice: item.rate, // Update latest purchase cost
          });

          const stockTx: StockTransaction = {
            id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            productId: product.id,
            productName: product.name,
            date: purchase.date,
            type: 'PURCHASE',
            quantity: item.quantity,
            unitPrice: item.rate,
            referenceId: purchase.id,
            referenceNumber: purchase.purchaseNumber,
            notes: `Purchased from ${purchase.supplierName} (Bill: ${purchase.supplierInvoiceNumber || purchase.purchaseNumber})`,
            balanceAfter: newStock,
            createdAt: new Date().toISOString(),
          };
          await db.stockTransactions.add(stockTx);
        }
      }

      // 3. Deduct bank/cash if paid
      if (purchase.paidAmount > 0) {
        const paymentRecord: PaymentRecord = {
          id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'PAY',
          partyType: 'SUPPLIER',
          partyId: purchase.supplierId,
          partyName: purchase.supplierName,
          amount: purchase.paidAmount,
          date: purchase.date,
          paymentMode: purchase.paymentMode,
          bankAccountId: purchase.bankAccountId,
          linkedInvoiceId: purchase.id,
          linkedInvoiceNumber: purchase.purchaseNumber,
          notes: `Payment for Purchase #${purchase.purchaseNumber}`,
          createdAt: new Date().toISOString(),
        };
        await db.payments.add(paymentRecord);

        if (purchase.bankAccountId) {
          const bank = await db.bankAccounts.get(purchase.bankAccountId);
          if (bank) {
            await db.bankAccounts.update(bank.id, {
              currentBalance: Number((bank.currentBalance - purchase.paidAmount).toFixed(2)),
            });
          }
        }
      }

      // 4. Double-entry Journal Entry
      const journalLines = [
        {
          accountCode: '5001',
          accountName: 'Purchases / Cost of Goods Sold',
          debit: purchase.taxableAmount,
          credit: 0,
        },
      ];

      if (purchase.isInterstate) {
        if (purchase.igstTotal > 0) {
          journalLines.push({
            accountCode: '1203',
            accountName: 'Input IGST Credit',
            debit: purchase.igstTotal,
            credit: 0,
          });
        }
      } else {
        if (purchase.cgstTotal > 0) {
          journalLines.push({
            accountCode: '1201',
            accountName: 'Input CGST Credit',
            debit: purchase.cgstTotal,
            credit: 0,
          });
        }
        if (purchase.sgstTotal > 0) {
          journalLines.push({
            accountCode: '1202',
            accountName: 'Input SGST Credit',
            debit: purchase.sgstTotal,
            credit: 0,
          });
        }
      }

      if (purchase.paidAmount > 0) {
        journalLines.push({
          accountCode: purchase.paymentMode === 'CASH' ? '1001' : '1002',
          accountName: purchase.paymentMode === 'CASH' ? 'Cash in Hand' : 'Bank Account',
          debit: 0,
          credit: purchase.paidAmount,
        });
      }

      if (purchase.balanceAmount > 0) {
        journalLines.push({
          accountCode: '2001',
          accountName: `Accounts Payable (${purchase.supplierName})`,
          debit: 0,
          credit: purchase.balanceAmount,
        });
      }

      const journalEntry: JournalEntry = {
        id: `je-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: purchase.date,
        referenceType: 'PURCHASE',
        referenceId: purchase.id,
        referenceNumber: purchase.purchaseNumber,
        narration: `Purchase from ${purchase.supplierName} Bill #${purchase.supplierInvoiceNumber || purchase.purchaseNumber}`,
        lines: journalLines,
        createdAt: new Date().toISOString(),
      };

      await db.journalEntries.add(journalEntry);
    }
  );
}

// Transaction Safe: Receive Payment from Customer or Pay Supplier
export async function recordPayment(payment: PaymentRecord): Promise<void> {
  await db.transaction(
    'rw',
    [db.payments, db.customers, db.suppliers, db.bankAccounts, db.journalEntries, db.sales, db.purchases],
    async () => {
      await db.payments.add(payment);

      if (payment.partyType === 'CUSTOMER') {
        const customer = await db.customers.get(payment.partyId);
        if (customer) {
          const newBal = Number((customer.currentBalance - payment.amount).toFixed(2));
          await db.customers.update(customer.id, { currentBalance: newBal });
        }

        // Increase bank/cash
        if (payment.bankAccountId) {
          const bank = await db.bankAccounts.get(payment.bankAccountId);
          if (bank) {
            await db.bankAccounts.update(bank.id, {
              currentBalance: Number((bank.currentBalance + payment.amount).toFixed(2)),
            });
          }
        }

        // Journal
        await db.journalEntries.add({
          id: `je-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          date: payment.date,
          referenceType: 'PAYMENT_RECEIVED',
          referenceId: payment.id,
          referenceNumber: payment.referenceNo,
          narration: `Received payment from customer ${payment.partyName} via ${payment.paymentMode}`,
          lines: [
            {
              accountCode: payment.paymentMode === 'CASH' ? '1001' : '1002',
              accountName: payment.paymentMode === 'CASH' ? 'Cash in Hand' : 'Bank Account',
              debit: payment.amount,
              credit: 0,
            },
            {
              accountCode: '1100',
              accountName: `Accounts Receivable (${payment.partyName})`,
              debit: 0,
              credit: payment.amount,
            },
          ],
          createdAt: new Date().toISOString(),
        });

        // If linked to specific sale invoice, update paid/balance amount
        if (payment.linkedInvoiceId) {
          const sale = await db.sales.get(payment.linkedInvoiceId);
          if (sale) {
            const newPaid = Number((sale.paidAmount + payment.amount).toFixed(2));
            const newBalance = Math.max(0, Number((sale.grandTotal - newPaid).toFixed(2)));
            const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';
            await db.sales.update(sale.id, {
              paidAmount: newPaid,
              balanceAmount: newBalance,
              paymentStatus: newStatus,
            });
          }
        }
      } else {
        // Paying Supplier
        const supplier = await db.suppliers.get(payment.partyId);
        if (supplier) {
          const newBal = Number((supplier.currentBalance - payment.amount).toFixed(2));
          await db.suppliers.update(supplier.id, { currentBalance: newBal });
        }

        // Decrease bank/cash
        if (payment.bankAccountId) {
          const bank = await db.bankAccounts.get(payment.bankAccountId);
          if (bank) {
            await db.bankAccounts.update(bank.id, {
              currentBalance: Number((bank.currentBalance - payment.amount).toFixed(2)),
            });
          }
        }

        // Journal
        await db.journalEntries.add({
          id: `je-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          date: payment.date,
          referenceType: 'PAYMENT_MADE',
          referenceId: payment.id,
          referenceNumber: payment.referenceNo,
          narration: `Payment made to supplier ${payment.partyName} via ${payment.paymentMode}`,
          lines: [
            {
              accountCode: '2001',
              accountName: `Accounts Payable (${payment.partyName})`,
              debit: payment.amount,
              credit: 0,
            },
            {
              accountCode: payment.paymentMode === 'CASH' ? '1001' : '1002',
              accountName: payment.paymentMode === 'CASH' ? 'Cash in Hand' : 'Bank Account',
              debit: 0,
              credit: payment.amount,
            },
          ],
          createdAt: new Date().toISOString(),
        });

        if (payment.linkedInvoiceId) {
          const purchase = await db.purchases.get(payment.linkedInvoiceId);
          if (purchase) {
            const newPaid = Number((purchase.paidAmount + payment.amount).toFixed(2));
            const newBalance = Math.max(0, Number((purchase.grandTotal - newPaid).toFixed(2)));
            const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';
            await db.purchases.update(purchase.id, {
              paidAmount: newPaid,
              balanceAmount: newBalance,
              paymentStatus: newStatus,
            });
          }
        }
      }
    }
  );
}

// Transaction Safe: Record Expense
export async function recordExpense(expense: Expense): Promise<void> {
  await db.transaction('rw', [db.expenses, db.bankAccounts, db.journalEntries], async () => {
    await db.expenses.add(expense);

    if (expense.bankAccountId) {
      const bank = await db.bankAccounts.get(expense.bankAccountId);
      if (bank) {
        await db.bankAccounts.update(bank.id, {
          currentBalance: Number((bank.currentBalance - expense.amount).toFixed(2)),
        });
      }
    }

    await db.journalEntries.add({
      id: `je-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: expense.date,
      referenceType: 'EXPENSE',
      referenceId: expense.id,
      referenceNumber: expense.reference,
      narration: `Expense: ${expense.category} - ${expense.notes || 'General expense'}`,
      lines: [
        {
          accountCode: '6001',
          accountName: `Operating Expense: ${expense.category}`,
          debit: expense.amount,
          credit: 0,
        },
        {
          accountCode: expense.paymentMode === 'CASH' ? '1001' : '1002',
          accountName: expense.paymentMode === 'CASH' ? 'Cash in Hand' : 'Bank Account',
          debit: 0,
          credit: expense.amount,
        },
      ],
      createdAt: new Date().toISOString(),
    });
  });
}

// Transaction Safe: Stock Adjustment
export async function recordStockAdjustment(
  productId: string,
  changeQty: number, // positive for found/add, negative for damaged/lost
  type: 'ADJUSTMENT_ADD' | 'ADJUSTMENT_REMOVE',
  reason: string
): Promise<void> {
  await db.transaction('rw', [db.products, db.stockTransactions, db.journalEntries], async () => {
    const product = await db.products.get(productId);
    if (!product) throw new Error('Product not found');

    const newStock = Number((product.currentStock + (type === 'ADJUSTMENT_ADD' ? changeQty : -changeQty)).toFixed(2));
    await db.products.update(productId, { currentStock: newStock });

    const stockTx: StockTransaction = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: product.id,
      productName: product.name,
      date: new Date().toISOString().slice(0, 10),
      type,
      quantity: changeQty,
      unitPrice: product.purchasePrice,
      notes: `Stock Adjustment: ${reason}`,
      balanceAfter: newStock,
      createdAt: new Date().toISOString(),
    };
    await db.stockTransactions.add(stockTx);

    // Accounting effect: Inventory vs Stock Variance / Loss
    const val = Number((changeQty * product.purchasePrice).toFixed(2));
    if (type === 'ADJUSTMENT_REMOVE') {
      await db.journalEntries.add({
        id: `je-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: new Date().toISOString().slice(0, 10),
        referenceType: 'STOCK_ADJUSTMENT',
        referenceId: stockTx.id,
        narration: `Stock write-off: ${product.name} (${changeQty} units) - ${reason}`,
        lines: [
          { accountCode: '6099', accountName: 'Inventory Shrinkage & Loss', debit: val, credit: 0 },
          { accountCode: '1300', accountName: 'Inventory Asset', debit: 0, credit: val },
        ],
        createdAt: new Date().toISOString(),
      });
    } else {
      await db.journalEntries.add({
        id: `je-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: new Date().toISOString().slice(0, 10),
        referenceType: 'STOCK_ADJUSTMENT',
        referenceId: stockTx.id,
        narration: `Stock surplus: ${product.name} (${changeQty} units) - ${reason}`,
        lines: [
          { accountCode: '1300', accountName: 'Inventory Asset', debit: val, credit: 0 },
          { accountCode: '4099', accountName: 'Inventory Gain / Opening Correction', debit: 0, credit: val },
        ],
        createdAt: new Date().toISOString(),
      });
    }
  });
}

// Full Structured Database Export to JSON
export async function exportDatabaseBackup(): Promise<string> {
  const data = {
    version: '1.0.0',
    app: 'BharatLedger',
    exportedAt: new Date().toISOString(),
    company: await db.company.toArray(),
    customers: await db.customers.toArray(),
    suppliers: await db.suppliers.toArray(),
    products: await db.products.toArray(),
    sales: await db.sales.toArray(),
    purchases: await db.purchases.toArray(),
    stockTransactions: await db.stockTransactions.toArray(),
    payments: await db.payments.toArray(),
    bankAccounts: await db.bankAccounts.toArray(),
    expenses: await db.expenses.toArray(),
    creditDebitNotes: await db.creditDebitNotes.toArray(),
    journalEntries: await db.journalEntries.toArray(),
    userAccounts: await db.userAccounts.toArray(),
  };
  return JSON.stringify(data, null, 2);
}

// Full Structured Database Restore from JSON
export async function restoreDatabaseBackup(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.app || data.app !== 'BharatLedger') {
      throw new Error('Invalid backup file. Missing BharatLedger identifier.');
    }

    await db.transaction(
      'rw',
      [
        db.company,
        db.customers,
        db.suppliers,
        db.products,
        db.sales,
        db.purchases,
        db.stockTransactions,
        db.payments,
        db.bankAccounts,
        db.expenses,
        db.creditDebitNotes,
        db.journalEntries,
        db.userAccounts,
      ],
      async () => {
        // Clear all
        await Promise.all([
          db.company.clear(),
          db.customers.clear(),
          db.suppliers.clear(),
          db.products.clear(),
          db.sales.clear(),
          db.purchases.clear(),
          db.stockTransactions.clear(),
          db.payments.clear(),
          db.bankAccounts.clear(),
          db.expenses.clear(),
          db.creditDebitNotes.clear(),
          db.journalEntries.clear(),
          db.userAccounts.clear(),
        ]);

        if (data.company?.length) await db.company.bulkAdd(data.company);
        if (data.customers?.length) await db.customers.bulkAdd(data.customers);
        if (data.suppliers?.length) await db.suppliers.bulkAdd(data.suppliers);
        if (data.products?.length) await db.products.bulkAdd(data.products);
        if (data.sales?.length) await db.sales.bulkAdd(data.sales);
        if (data.purchases?.length) await db.purchases.bulkAdd(data.purchases);
        if (data.stockTransactions?.length) await db.stockTransactions.bulkAdd(data.stockTransactions);
        if (data.payments?.length) await db.payments.bulkAdd(data.payments);
        if (data.bankAccounts?.length) await db.bankAccounts.bulkAdd(data.bankAccounts);
        if (data.expenses?.length) await db.expenses.bulkAdd(data.expenses);
        if (data.creditDebitNotes?.length) await db.creditDebitNotes.bulkAdd(data.creditDebitNotes);
        if (data.journalEntries?.length) await db.journalEntries.bulkAdd(data.journalEntries);
        if (data.userAccounts?.length) await db.userAccounts.bulkAdd(data.userAccounts);
      }
    );

    return { success: true, message: 'Database successfully restored from backup file.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to restore backup' };
  }
}

// Clear all data and reset to default company
export async function resetDatabaseToClean(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.company,
      db.customers,
      db.suppliers,
      db.products,
      db.sales,
      db.purchases,
      db.stockTransactions,
      db.payments,
      db.bankAccounts,
      db.expenses,
      db.creditDebitNotes,
      db.journalEntries,
      db.userAccounts,
    ],
    async () => {
      await Promise.all([
        db.company.clear(),
        db.customers.clear(),
        db.suppliers.clear(),
        db.products.clear(),
        db.sales.clear(),
        db.purchases.clear(),
        db.stockTransactions.clear(),
        db.payments.clear(),
        db.bankAccounts.clear(),
        db.expenses.clear(),
        db.creditDebitNotes.clear(),
        db.journalEntries.clear(),
        db.userAccounts.clear(),
      ]);

      await db.company.put(DEFAULT_COMPANY);
      for (const b of DEFAULT_BANK_ACCOUNTS) {
        await db.bankAccounts.put(b);
      }
      await db.userAccounts.put({
        id: 'admin-01',
        username: 'admin',
        fullName: 'Business Owner',
        role: 'ADMIN',
        pin: '1234',
        permissions: {
          sales: true,
          purchases: true,
          inventory: true,
          customers: true,
          suppliers: true,
          accounts: true,
          reports: true,
          settings: true,
        },
      });
    }
  );
}

