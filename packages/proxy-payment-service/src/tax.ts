const taxes = ['20%', '10%', '20/120', '10/110', '0%', 'Без НДС'] as const;
const taxCalculation = {
  '20%': (v: number) => v / 120 * 20,
  '10%': (v: number) => v / 110 * 10,
  '20/120': (v: number) => taxCalculation['20%'](v),
  '10/110': (v: number) => taxCalculation['10%'](v),
  '0%': (v: number) => v,
  'Без НДС': (v: number) => v,
} as const;

export { taxes, taxCalculation };
