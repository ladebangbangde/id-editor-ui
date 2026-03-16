const SIZE_OPTIONS = [
  { label: 'One Inch', value: 'one_inch', width: 295, height: 413, widthMm: 25, heightMm: 35 },
  { label: 'Two Inch', value: 'two_inch', width: 413, height: 579, widthMm: 35, heightMm: 49 },
  { label: 'Passport', value: 'passport', width: 413, height: 531, widthMm: 33, heightMm: 48 },
  { label: 'Visa', value: 'visa', width: 413, height: 531, widthMm: 33, heightMm: 48 }
];

const COLOR_OPTIONS = [
  { label: 'Blue', value: 'blue', hex: '#3A6FF7' },
  { label: 'White', value: 'white', hex: '#FFFFFF' },
  { label: 'Red', value: 'red', hex: '#E53935' }
];

const ORDER_STATUS_MAP = {
  pending: 'Pending',
  processing: 'Processing',
  success: 'Generated',
  paid: 'Paid',
  failed: 'Failed'
};

const DEFAULT_PRICE = 9.9;

const PAGE_TEXT = {
  INDEX_TITLE: 'AI ID Photo Maker',
  INDEX_SUBTITLE: 'Upload a selfie and generate professional ID photos instantly.',
  UPLOAD_HINT: 'Tap to take a photo or choose from album',
  GENERATE_BUTTON: 'Generate Now',
  FEATURE_LIST: [
    'AI background replacement',
    'Standard ID size crop',
    'HD image download support'
  ],
  PAYMENT_HINT: 'HD download may require payment if your order is not completed.',
  COMING_SOON: 'Coming soon'
};

const STORAGE_KEYS = {
  LAST_RESULT: 'last_result',
  USER_PROFILE: 'user_profile',
  LAST_RECORDS: 'last_records'
};

module.exports = {
  SIZE_OPTIONS,
  COLOR_OPTIONS,
  ORDER_STATUS_MAP,
  DEFAULT_PRICE,
  PAGE_TEXT,
  STORAGE_KEYS
};
