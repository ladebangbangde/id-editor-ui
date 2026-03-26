const { STORAGE_KEYS, MOCK_RESULT } = require('../../utils/constants');
const storage = require('../../utils/storage');
const { saveImageFromUrl } = require('../../utils/save-image');
const { getFlowDraft } = require('../../utils/flow-draft');
const { pickBestImageUrl: pickImageFromCandidates, cleanUrl, isLikelyLocalPath } = require('../../utils/image-url');
const {
  getFriendlySceneName,
  getFriendlySceneHint,
  getFriendlySizeText,
  pickBestImageUrl
} = require('../../utils/photo-display');
const {
  deriveDisplayState,
  getFriendlyStatusText,
  getFriendlyStatusSummary,
  getFriendlyIssueText,
  getFriendlyWarnings,
  getFriendlySaveHint
} = require('../../utils/photo-status-text');

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
      riskTitle: '建议注意',
      riskMessage: warnings[0] || getFriendlyIssueText(result.code, result.qualityMessage || result.message),
      riskCountText: warnings.length > 1 ? `有 ${warnings.length} 条提醒` : '请按提示调整后重试'
    };
  }
  if (reviewState === 'warning') {
    return {
      riskLevel: 'warning',
      riskTitle: '建议注意',
      riskMessage: warnings[0] || getFriendlyIssueText(result.code, result.qualityMessage),
      riskCountText: warnings.length > 1 ? `有 ${warnings.length} 条提醒` : '建议保存前再检查一下效果'
    };
  }

  return {
    riskLevel: 'passed',
    riskTitle: '建议注意',
    riskMessage: result.qualityMessage || '当前效果看起来正常，可以直接保存使用',
    riskCountText: '目前没有额外提醒'
  };
}

function normalizeWarnings(result = {}) {
  const warnings = Array.isArray(result.warnings) ? result.warnings : [];
  const riskTips = Array.isArray(result.riskTips) ? result.riskTips : [];
  const details = Array.isArray(result.details) ? result.details : [];
  return getFriendlyWarnings([...warnings, ...riskTips, ...details]);
}

function normalizeResult(result = {}) {
  const warnings = normalizeWarnings(result);
  const friendlyName = getFriendlySceneName(result, '证件照');
  const sceneHint = getFriendlySceneHint(result);
  const reviewState = deriveDisplayState(result);
  const summary = getFriendlyStatusSummary(reviewState);
  const qualityText = reviewState === 'failed' ? '不建议直接使用' : getFriendlyStatusText(result.qualityStatus || result.status || (reviewState === 'warning' ? 'WARNING' : 'SUCCESS'));
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
    statusSummary: summary,
    previewUrl,
    hdUrl,
    displayUrl,
    layoutUrl,
    printLayoutUrl: layoutUrl,
    fileDesc: getFriendlySaveHint(reviewState),
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
