const { STORAGE_KEYS, MOCK_RESULT } = require('../../utils/constants');
const storage = require('../../utils/storage');
const { saveImageFromUrl } = require('../../utils/save-image');
const { getFlowDraft } = require('../../utils/flow-draft');
const {
  getFriendlySceneName,
  getFriendlySceneHint,
  getFriendlySizeText,
  getQualityStatusLabel,
  pickBestImageUrl
} = require('../../utils/photo-display');

function buildRiskSummary(result = {}) {
  const warnings = Array.isArray(result.warnings) ? result.warnings : [];
  if (result.qualityStatus === 'WARNING' || warnings.length) {
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

function normalizeResult(result = {}) {
  const warnings = Array.isArray(result.warnings) ? result.warnings : [];
  const friendlyName = getFriendlySceneName(result, '证件照');
  const sceneHint = getFriendlySceneHint(result);
  const qualityText = getQualityStatusLabel(result.qualityStatus);
  const layoutUrl = result.printLayoutUrl || result.layoutUrl || '';

  return {
    ...result,
    warnings,
    sceneName: friendlyName,
    sceneHint,
    sizeText: getFriendlySizeText(result),
    qualityText,
    hdUrl: result.hdUrl || result.resultUrl || '',
    layoutUrl,
    printLayoutUrl: layoutUrl,
    fileDesc: layoutUrl
      ? '高清图和排版图都可以直接保存到手机相册'
      : '生成好的照片可以直接保存到手机相册',
    ...buildRiskSummary({
      ...result,
      warnings,
      qualityStatus: result.qualityStatus,
      qualityMessage: result.qualityMessage
    })
  };
}

Page({
  data: {
    result: null
  },

  onShow() {
    const result = storage.get(STORAGE_KEYS.CURRENT_RESULT, null) || MOCK_RESULT;
    const draft = getFlowDraft();
    this.setData({
      result: normalizeResult({
        ...result,
        sourceImageUrl: result.sourceImageUrl || draft.sourceImageUrl || draft.sourceImagePath || '',
        displayUrl: pickBestImageUrl(result)
      })
    });
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
    wx.redirectTo({ url: '/pages/upload/upload?autostartCamera=1&from=result-retake' });
  }
});
