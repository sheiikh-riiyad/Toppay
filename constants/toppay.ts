import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export type WalletIconName = keyof typeof MaterialIcons.glyphMap;

export const palette = {
  background: '#F5F7F4',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF4F0',
  ink: '#17231F',
  muted: '#64736D',
  border: '#DCE5DE',
  primary: '#0E8065',
  primaryDark: '#08624D',
  coral: '#F25F46',
  amber: '#F0B33D',
  cyan: '#1E9DB2',
  danger: '#D1493F',
  softGreen: '#E6F4EE',
  softCoral: '#FEEBE7',
  softAmber: '#FFF4D7',
  softCyan: '#E3F5F7',
  softNeutral: '#EDF0EC',
};

export type WalletAction = {
  title: string;
  subtitle: string;
  icon: WalletIconName;
  color: string;
  tone: string;
};

export type Transaction = {
  id: string;
  title: string;
  meta: string;
  amount: number;
  status: 'Completed' | 'Pending' | 'Failed';
  time: string;
  icon: WalletIconName;
  color: string;
  tone: string;
};

export type Contact = {
  name: string;
  phone: string;
  initials: string;
  color: string;
};

export type CashOutAgent = {
  name: string;
  code: string;
  area: string;
  distance: string;
  initials: string;
  color: string;
};

export type Sponsor = {
  name: string;
  mark: string;
  subtitle: string;
  color: string;
  tone: string;
};

export type OfferBanner = {
  eyebrow: string;
  title: string;
  body: string;
  action: string;
  icon: WalletIconName;
  color: string;
  accent: string;
  background: string;
};

export type AddBalanceMethod = {
  name: string;
  mark: string;
  type: 'Mobile wallet' | 'Bank account' | 'Card';
  receiverName: string;
  receiverAccount: string;
  instruction: string;
  color: string;
  tone: string;
  icon: WalletIconName;
};

export type PendingBalanceRequest = {
  id: string;
  method: string;
  amount: number;
  trxId: string;
  proofName: string;
  submittedAt: string;
  eta: string;
  status: 'Pending review' | 'Approved' | 'Rejected';
  color: string;
  tone: string;
  icon: WalletIconName;
};

export type CashOutMethod = {
  name: string;
  mark: string;
  type: 'Mobile wallet' | 'Bank account';
  receiverLabel: string;
  placeholder: string;
  color: string;
  tone: string;
  icon: WalletIconName;
};

export type PendingCashOutRequest = {
  id: string;
  method: string;
  receiverAccount: string;
  amount: number;
  charge: number;
  bonus: number;
  submittedAt: string;
  eta: string;
  status: 'Pending review' | 'Approved' | 'Rejected';
  color: string;
  tone: string;
  icon: WalletIconName;
};

export type MobileRechargeProvider = {
  name: string;
  mark: string;
  color: string;
  tone: string;
  icon: WalletIconName;
};

export type BillPayCategory = 'electricity' | 'internet';

export type BillPayBiller = {
  name: string;
  shortName: string;
  category: BillPayCategory;
  color: string;
  tone: string;
  icon: WalletIconName;
};

export const quickActions: WalletAction[] = [
  {
    title: 'Send Money',
    subtitle: 'To any Toppay account',
    icon: 'send',
    color: palette.primary,
    tone: palette.softGreen,
  },
  {
    title: 'Cash Out',
    subtitle: 'Submit payout request',
    icon: 'payments',
    color: palette.coral,
    tone: palette.softCoral,
  },
  {
    title: 'Recharge',
    subtitle: 'Mobile top-up',
    icon: 'phone-android',
    color: palette.cyan,
    tone: palette.softCyan,
  },
  {
    title: 'Payment',
    subtitle: 'Merchant checkout',
    icon: 'account-balance-wallet',
    color: palette.amber,
    tone: palette.softAmber,
  },
];

export const secondaryServices: WalletAction[] = [
  {
    title: 'Add Balance',
    subtitle: 'Manual approval',
    icon: 'add-card',
    color: palette.primary,
    tone: palette.softGreen,
  },
  {
    title: 'Rewards',
    subtitle: 'Cashback and offers',
    icon: 'redeem',
    color: palette.amber,
    tone: palette.softAmber,
  },
];

export const serviceCatalog: WalletAction[] = [
  ...quickActions,
  ...secondaryServices,
  {
    title: 'Electricity',
    subtitle: 'Prepaid and postpaid',
    icon: 'electric-bolt',
    color: palette.amber,
    tone: palette.softAmber,
  },
  {
    title: 'Internet',
    subtitle: 'Broadband bills',
    icon: 'router',
    color: palette.cyan,
    tone: palette.softCyan,
  },
  {
    title: 'Water',
    subtitle: 'City utility bills',
    icon: 'water-drop',
    color: palette.cyan,
    tone: palette.softCyan,
  },
  {
    title: 'Education',
    subtitle: 'Fees and admission',
    icon: 'school',
    color: palette.primary,
    tone: palette.softGreen,
  },
  {
    title: 'Donation',
    subtitle: 'Verified causes',
    icon: 'volunteer-activism',
    color: palette.coral,
    tone: palette.softCoral,
  },
];

export const transactions: Transaction[] = [
  {
    id: 'TP-840219',
    title: 'Coffee Mart',
    meta: 'Merchant payment',
    amount: -360,
    status: 'Completed',
    time: 'Today, 10:25 AM',
    icon: 'payments',
    color: palette.coral,
    tone: palette.softCoral,
  },
  {
    id: 'TP-840188',
    title: 'Nabila Akter',
    meta: 'Money received',
    amount: 2500,
    status: 'Completed',
    time: 'Today, 9:12 AM',
    icon: 'arrow-downward',
    color: palette.primary,
    tone: palette.softGreen,
  },
  {
    id: 'TP-840097',
    title: 'Robi Recharge',
    meta: 'Mobile top-up',
    amount: -199,
    status: 'Completed',
    time: 'Yesterday, 8:45 PM',
    icon: 'phone-android',
    color: palette.cyan,
    tone: palette.softCyan,
  },
  {
    id: 'TP-839940',
    title: 'DESCO Prepaid',
    meta: 'Electricity bill',
    amount: -1200,
    status: 'Pending',
    time: 'Yesterday, 5:30 PM',
    icon: 'electric-bolt',
    color: palette.amber,
    tone: palette.softAmber,
  },
  {
    id: 'TP-839712',
    title: 'Rafi Telecom',
    meta: 'Cash out',
    amount: -5000,
    status: 'Completed',
    time: 'Apr 28, 1:05 PM',
    icon: 'payments',
    color: palette.coral,
    tone: palette.softCoral,
  },
  {
    id: 'TP-839621',
    title: 'Bank Deposit',
    meta: 'Add balance',
    amount: 10000,
    status: 'Completed',
    time: 'Apr 27, 11:40 AM',
    icon: 'account-balance',
    color: palette.primary,
    tone: palette.softGreen,
  },
];

export const offerBanners: OfferBanner[] = [
  {
    eyebrow: 'Today only',
    title: 'Get up to 12% cashback',
    body: 'Pay bills or recharge from Toppay partners and collect instant rewards.',
    action: 'See offer',
    icon: 'campaign',
    color: palette.primary,
    accent: palette.amber,
    background: '#17342D',
  },
  {
    eyebrow: 'News',
    title: 'IFIC Bank add money is live',
    body: 'Link your bank account and move funds into Toppay in seconds.',
    action: 'Link bank',
    icon: 'newspaper',
    color: '#1D63A6',
    accent: '#D7E9FB',
    background: '#183554',
  },
  {
    eyebrow: 'Recharge',
    title: 'Save on mobile top-up',
    body: 'Recharge any operator and get partner points on every transaction.',
    action: 'Recharge now',
    icon: 'bolt',
    color: palette.coral,
    accent: '#FEE4DD',
    background: '#4A2724',
  },
  {
    eyebrow: 'Security',
    title: 'Turn on biometric approval',
    body: 'Protect send money, cash out, and payment actions with device lock.',
    action: 'Enable now',
    icon: 'security',
    color: palette.primary,
    accent: '#DDF5EC',
    background: '#24342F',
  },
];

export const sponsors: Sponsor[] = [
  {
    name: 'bKash',
    mark: 'bK',
    subtitle: 'Cashback partner',
    color: '#D62872',
    tone: '#FCE7F0',
  },
  {
    name: 'Nagad',
    mark: 'Ng',
    subtitle: 'Mobile wallet',
    color: '#F05A28',
    tone: '#FEEDE5',
  },
  {
    name: 'Rocket',
    mark: 'Rk',
    subtitle: 'Banking partner',
    color: '#6D3A9C',
    tone: '#F0E8F8',
  },
  {
    name: 'mCash',
    mark: 'mC',
    subtitle: 'Payment partner',
    color: '#16845B',
    tone: '#E6F4EE',
  },
  {
    name: 'Islami Bank',
    mark: 'IB',
    subtitle: 'Bank partner',
    color: '#118A6B',
    tone: '#E4F5EF',
  },
  {
    name: 'IFIC Bank',
    mark: 'IF',
    subtitle: 'Bank partner',
    color: '#1D63A6',
    tone: '#E7F0FA',
  },
  {
    name: 'City Bank',
    mark: 'CB',
    subtitle: 'Card partner',
    color: '#C72735',
    tone: '#FBE7EA',
  },
  {
    name: 'Bank Asia',
    mark: 'BA',
    subtitle: 'Bank partner',
    color: '#2E5F9E',
    tone: '#E8F0FA',
  },
];

export const mobileRechargeProviders: MobileRechargeProvider[] = [
  {
    name: 'Grameenphone',
    mark: 'GP',
    color: '#1D63A6',
    tone: '#E7F0FA',
    icon: 'sim-card',
  },
  {
    name: 'Robi',
    mark: 'Rb',
    color: '#D9272E',
    tone: '#FBE7EA',
    icon: 'sim-card',
  },
  {
    name: 'Airtel',
    mark: 'At',
    color: '#ED1C24',
    tone: '#FEEBE7',
    icon: 'sim-card',
  },
  {
    name: 'Banglalink',
    mark: 'BL',
    color: '#F05A28',
    tone: '#FEEDE5',
    icon: 'sim-card',
  },
  {
    name: 'Teletalk',
    mark: 'TT',
    color: '#0E8065',
    tone: '#E6F4EE',
    icon: 'sim-card',
  },
  {
    name: 'Skitto',
    mark: 'Sk',
    color: '#6D3A9C',
    tone: '#F0E8F8',
    icon: 'sim-card',
  },
];

export const billPayBillers: BillPayBiller[] = [
  {
    name: 'Bangladesh Power Development Board',
    shortName: 'BPDB',
    category: 'electricity',
    color: palette.amber,
    tone: palette.softAmber,
    icon: 'electric-bolt',
  },
  {
    name: 'Bangladesh Rural Electrification Board',
    shortName: 'BREB / Palli Bidyut',
    category: 'electricity',
    color: '#0E8065',
    tone: palette.softGreen,
    icon: 'electric-bolt',
  },
  {
    name: 'Dhaka Electric Supply Company',
    shortName: 'DESCO',
    category: 'electricity',
    color: '#1D63A6',
    tone: '#E7F0FA',
    icon: 'electric-bolt',
  },
  {
    name: 'Dhaka Power Distribution Company',
    shortName: 'DPDC',
    category: 'electricity',
    color: '#D1493F',
    tone: palette.softCoral,
    icon: 'electric-bolt',
  },
  {
    name: 'Northern Electricity Supply Company',
    shortName: 'NESCO',
    category: 'electricity',
    color: '#6D3A9C',
    tone: '#F0E8F8',
    icon: 'electric-bolt',
  },
  {
    name: 'West Zone Power Distribution Company',
    shortName: 'WZPDCL',
    category: 'electricity',
    color: '#16845B',
    tone: '#E6F4EE',
    icon: 'electric-bolt',
  },
  {
    name: 'BTCL',
    shortName: 'BTCL',
    category: 'internet',
    color: '#0E8065',
    tone: palette.softGreen,
    icon: 'router',
  },
  {
    name: 'Link3 Technologies',
    shortName: 'Link3',
    category: 'internet',
    color: '#1D63A6',
    tone: '#E7F0FA',
    icon: 'router',
  },
  {
    name: 'Amber IT',
    shortName: 'Amber IT',
    category: 'internet',
    color: palette.amber,
    tone: palette.softAmber,
    icon: 'router',
  },
  {
    name: 'Dot Internet',
    shortName: 'Dot Internet',
    category: 'internet',
    color: palette.cyan,
    tone: palette.softCyan,
    icon: 'router',
  },
  {
    name: 'Carnival Internet',
    shortName: 'Carnival',
    category: 'internet',
    color: '#F05A28',
    tone: '#FEEDE5',
    icon: 'router',
  },
  {
    name: 'Sam Online',
    shortName: 'Sam Online',
    category: 'internet',
    color: '#6D3A9C',
    tone: '#F0E8F8',
    icon: 'router',
  },
  {
    name: 'Triangle Services',
    shortName: 'Triangle',
    category: 'internet',
    color: '#16845B',
    tone: '#E6F4EE',
    icon: 'router',
  },
  {
    name: 'ICC Communication',
    shortName: 'ICC',
    category: 'internet',
    color: '#C72735',
    tone: '#FBE7EA',
    icon: 'router',
  },
  {
    name: 'BDCOM Online',
    shortName: 'BDCOM',
    category: 'internet',
    color: '#2E5F9E',
    tone: '#E8F0FA',
    icon: 'router',
  },
  {
    name: 'ADN Telecom',
    shortName: 'ADN',
    category: 'internet',
    color: palette.primary,
    tone: palette.softGreen,
    icon: 'router',
  },
  {
    name: 'Akij Online',
    shortName: 'Akij',
    category: 'internet',
    color: palette.coral,
    tone: palette.softCoral,
    icon: 'router',
  },
  {
    name: 'Smile Broadband',
    shortName: 'Smile',
    category: 'internet',
    color: '#6D3A9C',
    tone: '#F0E8F8',
    icon: 'router',
  },
  {
    name: 'Infolink',
    shortName: 'Infolink',
    category: 'internet',
    color: palette.cyan,
    tone: palette.softCyan,
    icon: 'router',
  },
  {
    name: 'KS Network',
    shortName: 'KS',
    category: 'internet',
    color: '#1D63A6',
    tone: '#E7F0FA',
    icon: 'router',
  },
  {
    name: 'Race Online',
    shortName: 'Race',
    category: 'internet',
    color: '#F05A28',
    tone: '#FEEDE5',
    icon: 'router',
  },
  {
    name: 'Brilliant Connect',
    shortName: 'Brilliant',
    category: 'internet',
    color: '#16845B',
    tone: '#E6F4EE',
    icon: 'router',
  },
  {
    name: 'MetroNet Bangladesh',
    shortName: 'MetroNet',
    category: 'internet',
    color: '#2E5F9E',
    tone: '#E8F0FA',
    icon: 'router',
  },
  {
    name: 'Aamra Networks',
    shortName: 'Aamra',
    category: 'internet',
    color: palette.primary,
    tone: palette.softGreen,
    icon: 'router',
  },
  {
    name: 'Fiber@Home',
    shortName: 'Fiber@Home',
    category: 'internet',
    color: palette.amber,
    tone: palette.softAmber,
    icon: 'router',
  },
  {
    name: 'Other Internet Provider',
    shortName: 'Other ISP',
    category: 'internet',
    color: palette.muted,
    tone: palette.softNeutral,
    icon: 'router',
  },
];

export const addBalanceMethods: AddBalanceMethod[] = [
  {
    name: 'bKash',
    mark: 'bK',
    type: 'Mobile wallet',
    receiverName: 'Toppay Personal',
    receiverAccount: '01700 000 101',
    instruction: 'Send Money to this personal number, then submit your TRX ID.',
    color: '#D62872',
    tone: '#FCE7F0',
    icon: 'send-to-mobile',
  },
  {
    name: 'Nagad',
    mark: 'Ng',
    type: 'Mobile wallet',
    receiverName: 'Toppay Personal',
    receiverAccount: '01700 000 102',
    instruction: 'Send Money to this personal number, then submit your TRX ID.',
    color: '#F05A28',
    tone: '#FEEDE5',
    icon: 'send-to-mobile',
  },
  {
    name: 'Rocket',
    mark: 'Rk',
    type: 'Mobile wallet',
    receiverName: 'Toppay Personal',
    receiverAccount: '01700 000 103',
    instruction: 'Send Money to this personal number, then submit your TRX ID.',
    color: '#6D3A9C',
    tone: '#F0E8F8',
    icon: 'send-to-mobile',
  },
  {
    name: 'mCash',
    mark: 'mC',
    type: 'Mobile wallet',
    receiverName: 'Toppay Personal',
    receiverAccount: '01700 000 104',
    instruction: 'Send Money to this personal number, then submit your TRX ID.',
    color: '#16845B',
    tone: '#E6F4EE',
    icon: 'send-to-mobile',
  },
  {
    name: 'Islami Bank PLC',
    mark: 'IB',
    type: 'Bank account',
    receiverName: 'Toppay Holdings',
    receiverAccount: '2050 1234 5678 901',
    instruction: 'Deposit or transfer to this account, then submit TRX ID or reference.',
    color: '#118A6B',
    tone: '#E4F5EF',
    icon: 'account-balance',
  },
  {
    name: 'IFIC Bank PLC',
    mark: 'IF',
    type: 'Bank account',
    receiverName: 'Toppay Holdings',
    receiverAccount: '1090 4455 8800',
    instruction: 'Deposit or transfer to this account, then submit TRX ID or reference.',
    color: '#1D63A6',
    tone: '#E7F0FA',
    icon: 'account-balance',
  },
  {
    name: 'City Bank PLC',
    mark: 'CB',
    type: 'Bank account',
    receiverName: 'Toppay Holdings',
    receiverAccount: '3101 7788 1200',
    instruction: 'Deposit or transfer to this account, then submit TRX ID or reference.',
    color: '#C72735',
    tone: '#FBE7EA',
    icon: 'account-balance',
  },
  {
    name: 'Bank Asia PLC',
    mark: 'BA',
    type: 'Bank account',
    receiverName: 'Toppay Holdings',
    receiverAccount: '4090 2211 3377',
    instruction: 'Deposit or transfer to this account, then submit TRX ID or reference.',
    color: '#2E5F9E',
    tone: '#E8F0FA',
    icon: 'account-balance',
  },
];

export const pendingBalanceRequests: PendingBalanceRequest[] = [
  {
    id: 'TOP-UP-2401',
    method: 'bKash',
    amount: 5000,
    trxId: 'TXN8A91K24',
    proofName: 'payment-proof.jpg',
    submittedAt: 'Today, 12:18 PM',
    eta: 'Within 15 minutes',
    status: 'Pending review',
    color: '#D62872',
    tone: '#FCE7F0',
    icon: 'pending-actions',
  },
  {
    id: 'TOP-UP-2398',
    method: 'IFIC Bank PLC',
    amount: 10000,
    trxId: 'IFIC-884120',
    proofName: 'bank-slip.pdf',
    submittedAt: 'Yesterday, 7:42 PM',
    eta: 'Manual check',
    status: 'Pending review',
    color: '#1D63A6',
    tone: '#E7F0FA',
    icon: 'schedule',
  },
];

export const cashOutMethods: CashOutMethod[] = [
  {
    name: 'bKash',
    mark: 'bK',
    type: 'Mobile wallet',
    receiverLabel: 'Receiving bKash number',
    placeholder: '01XXXXXXXXX',
    color: '#D62872',
    tone: '#FCE7F0',
    icon: 'send-to-mobile',
  },
  {
    name: 'Nagad',
    mark: 'Ng',
    type: 'Mobile wallet',
    receiverLabel: 'Receiving Nagad number',
    placeholder: '01XXXXXXXXX',
    color: '#F05A28',
    tone: '#FEEDE5',
    icon: 'send-to-mobile',
  },
  {
    name: 'Rocket',
    mark: 'Rk',
    type: 'Mobile wallet',
    receiverLabel: 'Receiving Rocket number',
    placeholder: '01XXXXXXXXX',
    color: '#6D3A9C',
    tone: '#F0E8F8',
    icon: 'send-to-mobile',
  },
  {
    name: 'mCash',
    mark: 'mC',
    type: 'Mobile wallet',
    receiverLabel: 'Receiving mCash number',
    placeholder: '01XXXXXXXXX',
    color: '#16845B',
    tone: '#E6F4EE',
    icon: 'send-to-mobile',
  },
  {
    name: 'Islami Bank PLC',
    mark: 'IB',
    type: 'Bank account',
    receiverLabel: 'Receiving bank account',
    placeholder: 'Account number',
    color: '#118A6B',
    tone: '#E4F5EF',
    icon: 'account-balance',
  },
  {
    name: 'IFIC Bank PLC',
    mark: 'IF',
    type: 'Bank account',
    receiverLabel: 'Receiving bank account',
    placeholder: 'Account number',
    color: '#1D63A6',
    tone: '#E7F0FA',
    icon: 'account-balance',
  },
  {
    name: 'City Bank PLC',
    mark: 'CB',
    type: 'Bank account',
    receiverLabel: 'Receiving bank account',
    placeholder: 'Account number',
    color: '#C72735',
    tone: '#FBE7EA',
    icon: 'account-balance',
  },
  {
    name: 'Bank Asia PLC',
    mark: 'BA',
    type: 'Bank account',
    receiverLabel: 'Receiving bank account',
    placeholder: 'Account number',
    color: '#2E5F9E',
    tone: '#E8F0FA',
    icon: 'account-balance',
  },
];

export const pendingCashOutRequests: PendingCashOutRequest[] = [
  {
    id: 'CASH-3021',
    method: 'bKash',
    receiverAccount: '01710 220 443',
    amount: 5000,
    charge: 92.5,
    bonus: 20,
    submittedAt: 'Today, 1:22 PM',
    eta: 'Within 30 minutes',
    status: 'Pending review',
    color: '#D62872',
    tone: '#FCE7F0',
    icon: 'pending-actions',
  },
  {
    id: 'CASH-3017',
    method: 'Bank Asia PLC',
    receiverAccount: '4090 2211 3377',
    amount: 12000,
    charge: 222,
    bonus: 48,
    submittedAt: 'Yesterday, 9:16 PM',
    eta: 'Manual bank review',
    status: 'Pending review',
    color: '#2E5F9E',
    tone: '#E8F0FA',
    icon: 'schedule',
  },
  {
    id: 'CASH-3012',
    method: 'Nagad',
    receiverAccount: '01844 110 802',
    amount: 2500,
    charge: 46.25,
    bonus: 10,
    submittedAt: 'May 6, 5:10 PM',
    eta: 'Support review',
    status: 'Pending review',
    color: '#F05A28',
    tone: '#FEEDE5',
    icon: 'pending-actions',
  },
];

export const contacts: Contact[] = [
  { name: 'Arif', phone: '01710 220 443', initials: 'AR', color: palette.primary },
  { name: 'Nabila', phone: '01844 110 802', initials: 'NA', color: palette.coral },
  { name: 'Sajid', phone: '01620 902 118', initials: 'SJ', color: palette.cyan },
  { name: 'Mitu', phone: '01977 541 930', initials: 'MT', color: palette.amber },
];

export const cashOutAgents: CashOutAgent[] = [
  {
    name: 'Rafi Telecom',
    code: 'AG-1024',
    area: 'Mirpur 10',
    distance: '0.4 km',
    initials: 'RT',
    color: palette.coral,
  },
  {
    name: 'City Digital Point',
    code: 'AG-3188',
    area: 'Kazipara',
    distance: '0.8 km',
    initials: 'CD',
    color: palette.primary,
  },
  {
    name: 'Maya Enterprise',
    code: 'AG-4420',
    area: 'Shewrapara',
    distance: '1.1 km',
    initials: 'ME',
    color: palette.cyan,
  },
];

export const billers = [
  { name: 'DESCO', type: 'Electricity', due: 'BDT 1,200.00', icon: 'electric-bolt' as WalletIconName },
  { name: 'WASA', type: 'Water', due: 'BDT 540.00', icon: 'water-drop' as WalletIconName },
  { name: 'Carnival Internet', type: 'Internet', due: 'BDT 1,050.00', icon: 'bolt' as WalletIconName },
];

export function formatCurrency(amount: number) {
  const prefix = amount < 0 ? '-BDT ' : 'BDT ';
  return `${prefix}${Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
