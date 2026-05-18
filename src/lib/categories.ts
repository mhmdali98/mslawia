import { LucideIcon } from 'lucide-react';
import {
  UtensilsCrossed, Car, Zap, ShoppingBag, Gamepad2, Plane,
  Home, MoreHorizontal, Luggage, Building2, Heart, Users,
} from 'lucide-react';

export interface CategoryDef {
  id: string;
  labelAr: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { id: 'food',          labelAr: 'طعام',       icon: UtensilsCrossed, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  { id: 'transport',     labelAr: 'مواصلات',    icon: Car,             color: 'text-blue-400',   bg: 'bg-blue-400/10'   },
  { id: 'bills',         labelAr: 'فواتير',     icon: Zap,             color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { id: 'shopping',      labelAr: 'تسوّق',      icon: ShoppingBag,     color: 'text-pink-400',   bg: 'bg-pink-400/10'   },
  { id: 'entertainment', labelAr: 'ترفيه',      icon: Gamepad2,        color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { id: 'travel',        labelAr: 'سفر',        icon: Plane,           color: 'text-sky-400',    bg: 'bg-sky-400/10'    },
  { id: 'rent',          labelAr: 'إيجار',      icon: Home,            color: 'text-teal-400',   bg: 'bg-teal-400/10'   },
  { id: 'other',         labelAr: 'أخرى',       icon: MoreHorizontal,  color: 'text-slate-400',  bg: 'bg-slate-700'     },
];

export const GROUP_CATEGORIES: CategoryDef[] = [
  { id: 'trip',   labelAr: 'رحلة',        icon: Luggage,   color: 'text-sky-400',     bg: 'bg-sky-400/10'     },
  { id: 'home',   labelAr: 'سكن مشترك',  icon: Building2, color: 'text-teal-400',    bg: 'bg-teal-400/10'    },
  { id: 'couple', labelAr: 'زوجين',       icon: Heart,     color: 'text-pink-400',    bg: 'bg-pink-400/10'    },
  { id: 'other',  labelAr: 'أخرى',        icon: Users,     color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
];

export function getExpenseCategory(id?: string): CategoryDef {
  return EXPENSE_CATEGORIES.find(c => c.id === id) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}

export function getGroupCategory(id?: string): CategoryDef {
  return GROUP_CATEGORIES.find(c => c.id === id) ?? GROUP_CATEGORIES[GROUP_CATEGORIES.length - 1];
}
