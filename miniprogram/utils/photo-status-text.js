const STATUS_TEXT_MAP = {
  SUCCESS: '制作成功',
  PASS: '通过',
  WARNING: '存在提醒',
  FAIL: '制作失败',
  FAILED: '未通过'
};

const STATUS_SUMMARY_MAP = {
  passed: {
    title: '制作完成',
    subtitle: '照片已准备好，可以直接保存到相册'
  },
  warning: {
    title: '制作完成',
    subtitle: '照片已生成，保存前建议再检查一下效果'
  },
  failed: {
    title: '制作失败',
    subtitle: '当前照片不适合直接使用，请按提示调整后重试'
  }
};

const ISSUE_TEXT_MAP = {
  FACE_COLOR_POLLUTION: '面部颜色有些异常，建议检查后再保存',
  SKIN_TONE_ABNORMAL: '肤色看起来不太自然，建议重新生成',
  FOREGROUND_EDGE_BROKEN: '人物边缘不够自然，建议重新生成',
  FACIAL_FEATURE_CORRUPTED: '五官区域处理异常，建议更换照片重试',
  MOUTH_OPEN: '照片中嘴巴张开，不符合证件照要求',
  TONGUE_OUT: '检测到吐舌，不符合证件照要求',
  EXPRESSION_NOT_NEUTRAL: '表情不够自然，建议重新拍摄',
  EYE_OCCLUDED: '眼部状态异常，建议重新拍摄',
  HAND_OCCLUSION: '面部有遮挡，建议重新拍摄',
  HEAD_ACCESSORY: '头部遮挡较明显，建议重新拍摄',
  BAD_COMPOSITION: '构图不够合适，建议重新拍摄',
  BAD_LIGHTING: '光线不太理想，建议重新拍摄',
  NO_FACE_DETECTED: '没有检测到清晰人脸，请重新上传',
  MULTIPLE_FACES_DETECTED: '检测到多人，请上传单人照片',
  INVALID_IMAGE: '图片不符合处理要求，请更换照片',
  PROCESS_FAILED: '处理失败，请稍后重试'
};

function normalizeStatus(status = '') {
  return String(status || '').trim().toUpperCase();
}

function isLikelyCode(text = '') {
  return /^[A-Z0-9_]+$/.test(String(text || '').trim());
}

function deriveDisplayState(input = {}) {
  const statusList = [
    input.reviewState,
    input.qualityStatus,
    input.status,
    input.code
  ].map((item) => normalizeStatus(item));

  const failedSignals = ['FAILED', 'FAIL', 'REJECT', 'BLOCK', 'INVALID', 'ERROR'];
  const warningSignals = ['WARNING', 'WARN', 'RISK', 'REVIEW'];

  if (statusList.some((value) => failedSignals.some((signal) => value.includes(signal)))) {
    return 'failed';
  }

  if (statusList.some((value) => warningSignals.some((signal) => value.includes(signal)))) {
    return 'warning';
  }

  return 'passed';
}

function getFriendlyStatusText(status = '') {
  const normalized = normalizeStatus(status);
  return STATUS_TEXT_MAP[normalized] || '制作成功';
}

function getFriendlyStatusSummary(status = '') {
  const displayState = normalizeStatus(status).toLowerCase();
  return STATUS_SUMMARY_MAP[displayState] || STATUS_SUMMARY_MAP.passed;
}

function getFriendlyIssueText(code = '', fallback = '') {
  const normalizedCode = normalizeStatus(code);
  if (ISSUE_TEXT_MAP[normalizedCode]) {
    return ISSUE_TEXT_MAP[normalizedCode];
  }

  if (typeof fallback === 'string' && fallback.trim() && !isLikelyCode(fallback.trim())) {
    return fallback.trim();
  }

  return '照片存在异常，建议重新检查';
}

function normalizeWarningItem(item) {
  if (!item) return '';

  if (typeof item === 'string') {
    return getFriendlyIssueText(item, item);
  }

  if (typeof item === 'object') {
    return getFriendlyIssueText(item.code || item.reasonCode || '', item.message || item.detail || item.title || '');
  }

  return getFriendlyIssueText('', String(item || ''));
}

function getFriendlyWarnings(warnings = []) {
  if (!Array.isArray(warnings)) return [];
  return warnings.map((item) => normalizeWarningItem(item)).filter(Boolean);
}

function getFriendlySaveHint(displayState = 'passed') {
  if (displayState === 'failed') {
    return '当前结果不建议直接用于正式提交，请重新处理';
  }
  if (displayState === 'warning') {
    return '建议确认效果后再保存使用';
  }
  return '生成好的照片可以直接保存到手机相册';
}

module.exports = {
  deriveDisplayState,
  getFriendlyStatusText,
  getFriendlyStatusSummary,
  getFriendlyIssueText,
  getFriendlyWarnings,
  getFriendlySaveHint
};
