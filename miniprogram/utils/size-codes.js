const CANONICAL_SIZE_OPTIONS = [
  {
    sizeCode: 'one_inch',
    label: '一寸',
    widthMm: 25,
    heightMm: 35,
    pixelWidth: 295,
    pixelHeight: 413,
    hot: true,
    usage: '常规证件/报名'
  },
  {
    sizeCode: 'small_one_inch',
    label: '小一寸',
    widthMm: 22,
    heightMm: 32,
    pixelWidth: 260,
    pixelHeight: 378,
    hot: true,
    usage: '表格/工牌/驾照'
  },
  {
    sizeCode: 'two_inch',
    label: '二寸',
    widthMm: 35,
    heightMm: 49,
    pixelWidth: 413,
    pixelHeight: 579,
    hot: true,
    usage: '考试/资格审核'
  }
];

const SIZE_CODE_ALIAS_MAP = {
  one_inch: 'one_inch',
  one_inch_general: 'one_inch',
  resume: 'one_inch',
  resume_photo: 'one_inch',
  teacher_exam: 'one_inch',
  provincial_exam: 'one_inch',
  social_security: 'one_inch',
  passport: 'one_inch',
  visa: 'one_inch',
  passport_photo: 'one_inch',
  visa_photo: 'one_inch',
  health_certificate: 'one_inch',
  university_collect: 'one_inch',
  marriage_registration: 'two_inch',
  exam: 'two_inch',
  graduate_exam: 'two_inch',
  national_exam: 'two_inch',
  nurse_exam: 'two_inch',
  ielts_signup: 'two_inch',
  two_inch: 'two_inch',
  two_inch_general: 'two_inch',
  small_one_inch: 'small_one_inch',
  driving_license: 'small_one_inch',
  computer_exam: 'small_one_inch',
  mandarin_test: 'small_one_inch',
  id_card: 'small_one_inch'
};

function toCanonicalSizeCode(rawCode = '') {
  if (!rawCode) return '';
  return SIZE_CODE_ALIAS_MAP[rawCode] || '';
}

function getCanonicalOption(sizeCode = '') {
  return CANONICAL_SIZE_OPTIONS.find((item) => item.sizeCode === sizeCode) || null;
}

function buildSceneBySizeCode(sizeCode = '') {
  const option = getCanonicalOption(sizeCode);
  if (!option) return null;
  return {
    sceneKey: option.sizeCode,
    sceneName: option.label,
    widthMm: option.widthMm,
    heightMm: option.heightMm,
    pixelWidth: option.pixelWidth,
    pixelHeight: option.pixelHeight
  };
}

module.exports = {
  CANONICAL_SIZE_OPTIONS,
  SIZE_CODE_ALIAS_MAP,
  toCanonicalSizeCode,
  getCanonicalOption,
  buildSceneBySizeCode
};
