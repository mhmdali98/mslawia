import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'ar' | 'en';

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useLocale = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'ar' as Locale,
      setLocale: (locale) => {
        set({ locale });
        document.documentElement.lang = locale;
        document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
      },
    }),
    { name: 'mslawia-locale' }
  )
);

const TRANSLATIONS = {
  // Brand / global
  appName: { ar: 'مصاريا', en: 'Mslawia' },

  // Auth
  loginWithGoogle: { ar: 'تسجيل الدخول بـ Google', en: 'Sign in with Google' },
  logout: { ar: 'تسجيل خروج', en: 'Logout' },

  // Dashboard
  myGroups: { ar: 'مجموعاتي', en: 'My groups' },
  newGroup: { ar: 'مجموعة جديدة', en: 'New group' },
  noGroups: { ar: 'لا توجد مجموعات', en: 'No groups yet' },
  noGroupsDesc: {
    ar: 'أنشئ مجموعة جديدة أو انضم إلى مجموعة موجودة برمز الدعوة',
    en: 'Create a new group or join an existing one with an invite code',
  },
  createGroupAction: { ar: 'إنشاء مجموعة', en: 'Create group' },
  noGroupsYet: { ar: 'لا توجد مجموعات بعد', en: 'No groups yet' },
  group: { ar: 'مجموعة', en: 'group' },
  members: { ar: 'أعضاء', en: 'members' },
  member: { ar: 'عضو', en: 'member' },

  // Tabs
  tabExpenses: { ar: 'المصاريف', en: 'Expenses' },
  tabBalances: { ar: 'الأرصدة', en: 'Balances' },
  tabSettlements: { ar: 'التسويات', en: 'Settlements' },
  tabActivity: { ar: 'النشاط', en: 'Activity' },
  tabStats: { ar: 'إحصائيات', en: 'Stats' },

  // Group menu
  inviteMember: { ar: 'دعوة عضو', en: 'Invite member' },
  groupSettings: { ar: 'إعدادات المجموعة', en: 'Group settings' },
  exportJson: { ar: 'تصدير JSON', en: 'Export JSON' },
  leaveGroup: { ar: 'مغادرة المجموعة', en: 'Leave group' },
  deleteGroup: { ar: 'حذف المجموعة', en: 'Delete group' },

  // Expense form
  addExpense: { ar: 'إضافة مصروف', en: 'Add expense' },
  expense: { ar: 'مصروف', en: 'Expense' },
  editExpense: { ar: 'تعديل المصروف', en: 'Edit expense' },

  // Notifications
  notifications: { ar: 'الإشعارات', en: 'Notifications' },
  enableNotifications: { ar: 'تفعيل الإشعارات', en: 'Enable notifications' },
  disableNotifications: { ar: 'تعطيل الإشعارات', en: 'Disable notifications' },
  notificationsEnabled: { ar: 'تم تفعيل الإشعارات!', en: 'Notifications enabled!' },
  notificationsBlocked: { ar: 'الإشعارات محظورة من المتصفح.', en: 'Notifications are blocked by browser.' },

  // PWA
  installApp: { ar: 'تثبيت التطبيق', en: 'Install app' },
  installDesc: { ar: 'ثبّت مصاريا على هاتفك للوصول السريع', en: 'Install Mslawia on your phone for quick access' },
  install: { ar: 'تثبيت', en: 'Install' },
  later: { ar: 'لاحقاً', en: 'Later' },

  // Language
  language: { ar: 'اللغة', en: 'Language' },
  arabic: { ar: 'العربية', en: 'Arabic' },
  english: { ar: 'الإنجليزية', en: 'English' },

  // Activity feed messages
  added: { ar: 'أضاف', en: 'added' },
  paidTo: { ar: 'دفع لـ', en: 'paid to' },
  you: { ar: 'أنت', en: 'you' },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS;

export function useT() {
  const locale = useLocale(s => s.locale);
  return (key: TranslationKey): string => TRANSLATIONS[key]?.[locale] ?? key;
}

export function t(key: TranslationKey, locale?: Locale): string {
  const l = locale ?? useLocale.getState().locale;
  return TRANSLATIONS[key]?.[l] ?? key;
}
