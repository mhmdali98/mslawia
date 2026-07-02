export interface Currency {
  code: string;
  symbol: string;
  name: string;
  nameAr: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', nameAr: 'دولار أمريكي' },
  { code: 'EUR', symbol: '€', name: 'Euro', nameAr: 'يورو' },
  { code: 'GBP', symbol: '£', name: 'British Pound', nameAr: 'جنيه إسترليني' },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal', nameAr: 'ريال سعودي' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', nameAr: 'درهم إماراتي' },
  { code: 'EGP', symbol: 'ج.م', name: 'Egyptian Pound', nameAr: 'جنيه مصري' },
  { code: 'JOD', symbol: 'د.أ', name: 'Jordanian Dinar', nameAr: 'دينار أردني' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', nameAr: 'دينار كويتي' },
  { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal', nameAr: 'ريال قطري' },
  { code: 'OMR', symbol: 'ر.ع', name: 'Omani Rial', nameAr: 'ريال عماني' },
  { code: 'BHD', symbol: 'د.ب', name: 'Bahraini Dinar', nameAr: 'دينار بحريني' },
  { code: 'IQD', symbol: 'د.ع', name: 'Iraqi Dinar', nameAr: 'دينار عراقي' },
  { code: 'IRR', symbol: '﷼', name: 'Iranian Rial', nameAr: 'تومان إيراني' },
  { code: 'LBP', symbol: 'ل.ل', name: 'Lebanese Pound', nameAr: 'ليرة لبنانية' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', nameAr: 'ليرة تركية' },
];

const CURRENCY_MAP: Record<string, Currency> = Object.fromEntries(
  CURRENCIES.map(c => [c.code, c])
);

export function getCurrency(code: string): Currency {
  return CURRENCY_MAP[code] || CURRENCIES[0];
}
