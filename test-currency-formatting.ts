#!/usr/bin/env tsx
/**
 * Currency Formatting Test
 * Tests formatCurrency() function with various amounts to verify INR formatting
 */

import { formatCurrency } from './lib/utils';

console.log('🧪 Testing INR Currency Formatting\n');
console.log('Expected format: ₹ symbol with Indian number grouping (lakhs/crores)\n');

const testCases = [
  { amount: 500, label: 'Small amount (500)' },
  { amount: 999.50, label: 'Decimal amount (999.50)', showPaise: true },
  { amount: 1000, label: 'Thousand (1,000)' },
  { amount: 5000, label: 'Five thousand (5,000)' },
  { amount: 10000, label: 'Ten thousand (10,000)' },
  { amount: 50000, label: 'Fifty thousand (50,000)' },
  { amount: 100000, label: 'One lakh (1,00,000)' },
  { amount: 125000, label: 'One lakh twenty-five thousand (1,25,000)' },
  { amount: 1000000, label: 'Ten lakhs (10,00,000)' },
  { amount: 1250000, label: 'Twelve lakh fifty thousand (12,50,000)' },
  { amount: 10000000, label: 'One crore (1,00,00,000)' },
];

console.log('Test Results:');
console.log('─'.repeat(60));

testCases.forEach(({ amount, label, showPaise = false }) => {
  const formatted = formatCurrency(amount, showPaise);
  console.log(`${label.padEnd(45)} → ${formatted}`);
});

console.log('─'.repeat(60));
console.log('\n✅ Currency formatting test complete\n');
console.log('Expected characteristics:');
console.log('  • Symbol: ₹ (Indian Rupee)');
console.log('  • Grouping: Indian (lakhs: x,xx,xxx)');
console.log('  • Locale: en-IN');
console.log('  • Currency: INR');
console.log('  • Default: No decimal places');
console.log('  • With showPaise: 2 decimal places\n');
