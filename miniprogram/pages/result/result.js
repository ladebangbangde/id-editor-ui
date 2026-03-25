const { STORAGE_KEYS, MOCK_RESULT } = require('../../utils/constants');
const storage = require('../../utils/storage');
const { saveImageFromUrl } = require('../../utils/save-image');
const { getFlowDraft } = require('../../utils/flow-draft');
const { pickBestImageUrl: pickImageFromCandidates, cleanUrl, isLikelyLocalPath } = require('../../utils/image-url');
const {
  getFriendlySceneName,
  getFriendlySceneHint,
  getFriendlySizeText,
  getQualityStatusLabel,
  pickBestImageUrl
} = require('../../utils/photo-display');

function buildPreviewUrl(result = {}) {
  return pickImageFromCandidates([
    result.previewUrl,
    result.preview_url,
    result.result && result.result.previewUrl,
    result.result && result.result.preview_url,
    result.resultUrl,
    result.result_url,
    result.hdUrl,
    result.hd_url
  ]);
}

function buildHdUrl(result = {}) {
  return pickImageFromCandidates([
    result.hdUrl,
    result.hd_url,
    result.resultUrl,
    result.result_url,
    result.previewUrl,
    result.preview_url
  ]);
}

function logImageUrlRisk(tag, url) {
  const cleaned = cleanUrl(url);
  if (!cleaned) {
    console.warn(`[result] ${tag} is empty`);
    return;
  }
  if (/^http:\/\//i.test(cleaned)) {
    console.warn(`[result] ${tag} uses http, might be blocked on device`, cleaned);
  }
  if (isLikelyLocalPath(cleaned)) {
    console.warn(`[result] ${tag} looks like local/private address, might not be reachable on device`, cleaned);
  }
}

function buildRiskSummary(result = {}) {
  const warnings = Array.isArray(result.warnings) ? result.warnings : [];
  const reviewState = result.reviewState || 'passed';
  if (reviewState === 'failed') {
    return {
      riskLevel: 'failed',
      riskTitle: '检测未通过，请按提示调整后重试',
      riskMessage: result.qualityMessage || result.message || '本次结果未通过审核，暂不建议保存。',
      riskCountText: warnings.length ? `有 ${warnings.length} 条需要处理的问题` : '请按未通过原因调整后重新生成'
    };
  }
  if (reviewState === 'warning') {
    return {
      riskLevel: 'warning',
      riskTitle: '生成已经完成，保存前再看一眼会更安心',
      riskMessage: result.qualityMessage || '照片已经生成好啦，建议先看看这几条小提醒。',
      riskCountText: warnings.length ? `有 ${warnings.length} 条温馨提醒` : '建议先确认脸部和边缘是否自然'
    };
  }

  return {
    riskLevel: 'passed',
    riskTitle: '照片状态不错，可以放心保存',
    riskMessage: result.qualityMessage || '质量检测通过，接下来直接保存到相册就好。',
    riskCountText: '目前没有额外风险提示'
  };
}

function deriveReviewState(result = {}) {
  const quality = String(result.qualityStatus || '').toUpperCase();
  const status = String(result.status || '').toUpperCase();
  const code = String(result.code || '').toUpperCase();
  const failedSignals = ['FAILED', 'FAIL', 'REJECT', 'BLOCK', 'INVALID', 'ERROR'];
  const warningSignals = ['WARNING', 'WARN', 'RISK', 'REVIEW'];

  if (failedSignals.some((signal) => quality.includes(signal) || status.includes(signal) || code.includes(signal))) {
    return 'failed';
  }
  if (warningSignals.some((signal) => quality.includes(signal) || status.includes(signal) || code.includes(signal))) {
    return 'warning';
  }
  return 'passed';
}

function normalizeWarnings(result = {}) {
  const warnings = Array.isArray(result.warnings) ? result.warnings : [];
  const riskTips = Array.isArray(result.riskTips) ? result.riskTips : [];
  const details = Array.isArray(result.details)
    ? result.details
      .map((item) => {
        if (!item) return '';
        if (typeof item === 'string') return item;
        if (typeof item === 'object') return item.message || item.detail || item.title || '';
        return '';
      })
      .filter(Boolean)
    : [];
  return [...warnings, ...riskTips, ...details];
}

function normalizeResult(result = {}) {
  const warnings = normalizeWarnings(result);
  const friendlyName = getFriendlySceneName(result, '证件照');
  const sceneHint = getFriendlySceneHint(result);
  const reviewState = deriveReviewState(result);
  const qualityText = getQualityStatusLabel(result.qualityStatus || result.status || '');
  const layoutUrl = result.printLayoutUrl || result.layoutUrl || '';
  const previewUrl = buildPreviewUrl(result);
  const hdUrl = buildHdUrl(result);
  const displayUrl = pickImageFromCandidates([
    result.displayUrl,
    previewUrl,
    hdUrl,
    pickBestImageUrl(result)
  ]);

  return {
    ...result,
    warnings,
    sceneName: friendlyName,
    sceneHint,
    sizeText: getFriendlySizeText(result),
    qualityText,
    reviewState,
    previewUrl,
    hdUrl,
    displayUrl,
    layoutUrl,
    printLayoutUrl: layoutUrl,
    fileDesc: layoutUrl
      ? '高清图和排版图都可以直接保存到手机相册'
      : '生成好的照片可以直接保存到手机相册',
    ...buildRiskSummary({
      ...result,
      warnings,
      reviewState,
      qualityStatus: result.qualityStatus || result.status,
      qualityMessage: result.qualityMessage || result.message
    })
  };
}

Page({
  data: {
    result: null,
    previewImageFailed: false,
    hdImageFailed: false
  },

  onShow() {
    const rawResult = storage.get(STORAGE_KEYS.CURRENT_RESULT, null) || MOCK_RESULT;
    const draft = getFlowDraft();
    console.log('[result] raw storage result', rawResult);
    const normalized = normalizeResult({
      ...rawResult,
      sourceImageUrl: rawResult.sourceImageUrl || draft.sourceImageUrl || draft.sourceImagePath || '',
      displayUrl: pickBestImageUrl(rawResult)
    });
    const renderBranch = normalized.reviewState || 'passed';
    this.setData({
      previewImageFailed: false,
      hdImageFailed: false,
      result: normalized
    });
    console.log('[result] mapped status', {
      reviewState: normalized.reviewState,
      qualityStatus: normalized.qualityStatus,
      status: normalized.status,
      code: normalized.code
    });
    console.log('[result] render branch hit', renderBranch);
    console.log('[result] normalized image fields', {
      previewUrl: this.data.result && this.data.result.previewUrl,
      hdUrl: this.data.result && this.data.result.hdUrl,
      displayUrl: this.data.result && this.data.result.displayUrl
    });
    logImageUrlRisk('previewUrl', this.data.result && this.data.result.previewUrl);
    logImageUrlRisk('hdUrl', this.data.result && this.data.result.hdUrl);
  },

  handlePreviewImageError(event) {
    console.error('[result] preview image render failed', event && event.detail, this.data.result && this.data.result.previewUrl);
    this.setData({ previewImageFailed: true });
  },

  handleHdImageError(event) {
    console.error('[result] hd image render failed', event && event.detail, this.data.result && this.data.result.hdUrl);
    this.setData({ hdImageFailed: true });
  },

  async saveAsset(url, options = {}) {
    await saveImageFromUrl(url, options);
  },

  savePreview() {
    const { result } = this.data;
    this.saveAsset(result && result.previewUrl, {
      loadingText: '正在保存普通图',
      successText: '普通图已保存到相册'
    });
  },

  saveHd() {
    const { result } = this.data;
    this.saveAsset(result && (result.hdUrl || result.resultUrl), {
      loadingText: '正在保存高清图',
      successText: '高清图已保存到相册'
    });
  },

  saveLayout() {
    const { result } = this.data;
    this.saveAsset(result && (result.printLayoutUrl || result.layoutUrl), {
      emptyText: '这次结果里还没有排版图',
      loadingText: '正在保存排版图',
      successText: '排版图已保存到相册'
    });
  },

  goFaq() {
    wx.navigateTo({ url: '/pages/faq/faq' });
  },

  remake() {
    wx.navigateTo({ url: '/pages/editor/editor' });
  },

  reselectSize() {
    wx.navigateTo({ url: '/pages/custom-size/custom-size' });
  },

  retake() {
    wx.redirectTo({ url: '/pages/upload/upload?from=result-retake' });
  }
});
