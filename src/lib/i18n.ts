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
  appName: { ar: 'مصلاوية', en: 'Mslawia' },

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
  installDesc: { ar: 'ثبّت مصلاوية على هاتفك للوصول السريع', en: 'Install Mslawia on your phone for quick access' },
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

  // Stats
  statsEmpty: { ar: 'لا توجد إحصائيات بعد', en: 'No stats yet' },
  statsEmptyDesc: { ar: 'أضف مصاريف لترى التحليلات والملخصات', en: 'Add expenses to see analytics and summaries' },
  statsTotal: { ar: 'إجمالي المصاريف', en: 'Total expenses' },
  statsAvg: { ar: 'متوسط المصروف', en: 'Average expense' },
  statsPerExpense: { ar: 'للمصروف الواحد', en: 'per expense' },
  statsByCategory: { ar: 'حسب الفئة', en: 'By category' },
  statsByPayer: { ar: 'من دفع أكثر', en: 'Top payers' },
  statsByMonth: { ar: 'آخر الأشهر', en: 'Recent months' },
  formerMember: { ar: 'عضو سابق', en: 'Former member' },

  // Settlements
  settlementsTitle: { ar: 'التسويات', en: 'Settlements' },
  recordPayment: { ar: 'تسجيل دفعة', en: 'Record payment' },
  suggestedTransfers: { ar: 'تحويلات مقترحة', en: 'Suggested transfers' },
  suggestedTransfersDesc: { ar: 'تسوية بأقل عدد دفعات', en: 'Settle with fewest transfers' },
  settleAll: { ar: 'تسوية الكل', en: 'Settle all' },
  settleAllConfirm: { ar: 'تسوية جميع ديونك؟', en: 'Settle all your debts?' },
  settleAllDesc: { ar: 'سيتم تسجيل جميع التحويلات المقترحة المتعلقة بك.', en: 'All suggested transfers involving you will be recorded.' },
  paymentRecorded: { ar: 'تم تسجيل الدفعة', en: 'Payment recorded' },
  noSettlements: { ar: 'لا توجد تسويات', en: 'No settlements' },
  noSettlementsDesc: { ar: 'أضف مصاريف لترى التسويات المقترحة، أو سجّل دفعة يدوية', en: 'Add expenses to see suggested settlements, or record a payment manually' },
  settleConfirmTitle: { ar: 'تسوية جميع ديونك؟', en: 'Settle all your debts?' },
  paidLabel: { ar: 'دفع لـ', en: 'paid to' },
  settleBtn: { ar: 'تمّت', en: 'Done' },
  recordPaymentTitle: { ar: 'تسجيل دفعة', en: 'Record payment' },
  whoPaid: { ar: 'من دفع؟', en: 'Who paid?' },
  toWhom: { ar: 'لمن؟', en: 'To whom?' },
  amountLabel: { ar: 'المبلغ', en: 'Amount' },
  noteOptional: { ar: 'ملاحظة (اختيارية)', en: 'Note (optional)' },
  paymentReasonPlaceholder: { ar: 'سبب الدفع...', en: 'Reason for payment...' },
  submitPayment: { ar: 'تسجيل الدفعة', en: 'Record payment' },

  // Activity
  activityEmpty: { ar: 'لا يوجد نشاط', en: 'No activity' },
  activityEmptyDesc: { ar: 'أضف مصاريف أو سجّل تسويات لتظهر هنا', en: 'Add expenses or record settlements to see activity' },
  activityAddedExpense: { ar: 'أضاف', en: 'added' },
  yourShare: { ar: 'حصتك', en: 'Your share' },
  youPaid: { ar: 'دفعت', en: 'You paid' },

  // Balances
  allSettled: { ar: 'جميع الأرصدة مسوّاة', en: 'All settled up' },
  allSettledDesc: { ar: 'لا يوجد ديون حالياً في المجموعة', en: 'No outstanding debts in the group' },
  owes: { ar: 'مدين', en: 'Owes' },
  isOwed: { ar: 'يستحق', en: 'Is owed' },
  settled: { ar: 'مسوّى', en: 'Settled' },
  tapForDetails: { ar: '· اضغط للتفاصيل', en: '· tap for details' },
  owesTo: { ar: 'يدفع لـ', en: 'Pays to' },
  owedBy: { ar: 'يستلم من', en: 'Receives from' },
  suggestedTransfersTitle: { ar: 'التحويلات المقترحة', en: 'Suggested transfers' },

  // Permissions
  permissionsTitle: { ar: 'صلاحيات الأعضاء', en: 'Member permissions' },
  permMembersAddExpenses: { ar: 'يمكن للأعضاء إضافة مصاريف', en: 'Members can add expenses' },
  permMembersSettle: { ar: 'يمكن للأعضاء تسجيل تسويات', en: 'Members can record settlements' },
  permOwnerAlways: { ar: 'المنشئ دائماً يمكنه القيام بكل العمليات.', en: 'The owner can always do everything.' },
  ownerOnly: { ar: 'فقط مالك المجموعة يمكنه تعديل الإعدادات', en: 'Only the group owner can edit settings' },

  // Group info (for non-owners)
  groupInfo: { ar: 'معلومات المجموعة', en: 'Group info' },
  groupSettings2: { ar: 'إعدادات المجموعة', en: 'Group settings' },
  saveChanges: { ar: 'حفظ التعديلات', en: 'Save changes' },

  // Install
  installAppTitle: { ar: 'تثبيت التطبيق', en: 'Install app' },
  appInstalled: { ar: 'التطبيق مثبّت', en: 'App installed' },
  installNotAvailable: { ar: 'غير متاح للتثبيت', en: 'Install not available' },
  iosInstallHint: { ar: 'لتثبيت التطبيق على iPhone: اضغط مشاركة ← أضف إلى الشاشة الرئيسية', en: 'To install on iPhone: tap Share → Add to Home Screen' },

  // Errors / actions
  loadMore: { ar: 'عرض المزيد', en: 'Show more' },
  myBalanceInGroup: { ar: 'رصيدك في المجموعة', en: 'Your balance in group' },
  personOwesYou: { ar: 'شخص يدين لك', en: 'person owes you' },
  personsOweYou: { ar: 'أشخاص يدينون لك', en: 'people owe you' },
  needToPay: { ar: 'تحتاج لدفع', en: 'need to pay' },
  person: { ar: 'شخص', en: 'person' },
  expenseDeleted: { ar: 'تم حذف المصروف.', en: 'Expense deleted.' },
  settlementDeleted: { ar: 'تم حذف التسوية.', en: 'Settlement deleted.' },

  // Month names (for stats/expenses)
  month1: { ar: 'يناير', en: 'Jan' },
  month2: { ar: 'فبراير', en: 'Feb' },
  month3: { ar: 'مارس', en: 'Mar' },
  month4: { ar: 'أبريل', en: 'Apr' },
  month5: { ar: 'مايو', en: 'May' },
  month6: { ar: 'يونيو', en: 'Jun' },
  month7: { ar: 'يوليو', en: 'Jul' },
  month8: { ar: 'أغسطس', en: 'Aug' },
  month9: { ar: 'سبتمبر', en: 'Sep' },
  month10: { ar: 'أكتوبر', en: 'Oct' },
  month11: { ar: 'نوفمبر', en: 'Nov' },
  month12: { ar: 'ديسمبر', en: 'Dec' },
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

export function useMonthName() {
  const locale = useLocale(s => s.locale);
  return (monthNum: number): string => {
    const keys = ['month1','month2','month3','month4','month5','month6',
                  'month7','month8','month9','month10','month11','month12'] as const;
    return TRANSLATIONS[keys[monthNum - 1]]?.[locale] ?? String(monthNum);
  };
}
