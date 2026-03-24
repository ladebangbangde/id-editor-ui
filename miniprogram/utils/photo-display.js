const SPEC_META = {
  one_inch: {
    title: '一寸证件照（最常用）',
    shortTitle: '一寸证件照',
    hint: '适合多数普通报名使用'
  },
  small_one_inch: {
    title: '小一寸证件照',
    shortTitle: '小一寸证件照',
    hint: '常见于表格、工牌和部分报名'
  },
  two_inch: {
    title: '二寸证件照（报名常见）',
    shortTitle: '二寸证件照',
    hint: '常见于报名和资格审核'
  },
  passport: {
    title: '护照照片',
    shortTitle: '护照照片',
    hint: '常见于护照办理'
  },
  visa: {
    title: '签证照片',
    shortTitle: '签证照片',
    hint: '常见于签证资料准备'
  },
  driving_license: {
    title: '驾驶证照片',
    shortTitle: '驾驶证照片',
    hint: '常用于驾驶证报名或换证'
  },
  resume: {
    title: '简历照片',
    shortTitle: '简历照片',
    hint: '适合简历和求职资料'
  },
  exam: {
    title: '考试报名照',
    shortTitle: '考试报名照',
    hint: '常用于考试报名上传'
  },
  teacher_exam: {
    title: '教资报名照',
    shortTitle: '教资报名照',
    hint: '常用于教师资格考试报名'
  },
  computer_exam: {
    title: '计算机考试报名照',
    shortTitle: '计算机考试报名照',
    hint: '适合等级考试报名上传'
  },
  university_collect: {
    title: '学籍采集照片',
    shortTitle: '学籍采集照片',
    hint: '常见于毕业和学籍图像采集'
  },
  health_certificate: {
    title: '健康证照片',
    shortTitle: '健康证照片',
    hint: '常用于健康证办理'
  },
  nurse_exam: {
    title: '护士考试报名照',
    shortTitle: '护士考试报名照',
    hint: '适合医药卫生考试报名'
  },
  mandarin_test: {
    title: '普通话考试照片',
    shortTitle: '普通话考试照片',
    hint: '常用于普通话考试报名'
  },
  ielts_signup: {
    title: '雅思报名照',
    shortTitle: '雅思报名照',
    hint: '适合语言考试资料提交'
  },
  provincial_exam: {
    title: '省考报名照',
    shortTitle: '省考报名照',
    hint: '常用于公务员省考报名'
  },
  national_exam: {
    title: '国考报名照',
    shortTitle: '国考报名照',
    hint: '常用于国家公务员考试报名'
  },
  graduate_exam: {
    title: '考研报名照',
    shortTitle: '考研报名照',
    hint: '适合研究生考试报名上传'
  },
  passport_photo: {
    title: '护照照片',
    shortTitle: '护照照片',
    hint: '常见于护照办理'
  },
  visa_photo: {
    title: '签证照片',
    shortTitle: '签证照片',
    hint: '常见于签证资料准备'
  },
  id_card: {
    title: '身份证证件照',
    shortTitle: '身份证证件照',
    hint: '适合证件资料准备'
  },
  social_security: {
    title: '社保卡照片',
    shortTitle: '社保卡照片',
    hint: '常用于社保卡和民政资料'
  },
  marriage_registration: {
    title: '结婚登记照',
    shortTitle: '结婚登记照',
    hint: '登记照通常更适合红底'
  }
};

const SPEC_ALIASES = {
  one_inch_general: 'one_inch',
  resume_photo: 'resume',
  two_inch_general: 'two_inch',
  driver_license: 'driving_license'
};

const QUALITY_STATUS_MAP = {
  PASSED: '质量通过',
  WARNING: '需要留意',
  FAILED: '建议重拍',
  PROCESSING: '处理中'
};

function normalizeSpecKey(key = '') {
  if (!key) return '';
  return SPEC_ALIASES[key] || key;
}

function getSpecMetaByKey(key = '') {
  return SPEC_META[normalizeSpecKey(key)] || null;
}

function getPrimarySpecKey(input = {}) {
  return normalizeSpecKey(
    input.sceneKey
      || input.sizeCode
      || (input.scene && input.scene.sceneKey)
      || ''
  );
}

function getFriendlySceneName(input = {}, fallback = '证件照') {
  const meta = getSpecMetaByKey(getPrimarySpecKey(input));
  if (meta) return meta.title;
  return input.sceneName || input.name || fallback;
}

function getFriendlySceneHint(input = {}) {
  const meta = getSpecMetaByKey(getPrimarySpecKey(input));
  if (meta) return meta.hint;
  return input.tip || input.description || '';
}

function getFriendlySizeText(input = {}) {
  const title = getFriendlySceneName(input, '证件照');
  const widthMm = Number(input.widthMm || (input.scene && input.scene.widthMm) || 0);
  const heightMm = Number(input.heightMm || (input.scene && input.scene.heightMm) || 0);
  const mmText = widthMm && heightMm ? `${widthMm}×${heightMm}mm` : '';
  const rawSize = input.sizeText || input.size || '';

  if (title && mmText) {
    return `${title} · ${mmText}`;
  }
  if (rawSize && title && rawSize.indexOf(title) === -1) {
    return `${title} · ${rawSize}`;
  }
  return rawSize || mmText || title || input.sizeCode || '--';
}

function getFriendlyProcessingText(input = {}) {
  const title = getFriendlySceneName(input, '标准证件照');
  return `正在为你生成${title}`;
}

function getQualityStatusLabel(status = '') {
  return QUALITY_STATUS_MAP[status] || status || '处理中';
}

function pickBestImageUrl(input = {}) {
  return input.displayUrl
    || input.previewUrl
    || input.resultUrl
    || input.hdUrl
    || input.originalUrl
    || '';
}

module.exports = {
  SPEC_META,
  normalizeSpecKey,
  getSpecMetaByKey,
  getPrimarySpecKey,
  getFriendlySceneName,
  getFriendlySceneHint,
  getFriendlySizeText,
  getFriendlyProcessingText,
  getQualityStatusLabel,
  pickBestImageUrl
};
