const { STORAGE_KEYS, MOCK_RESULT } = require('../../utils/constants');
const storage = require('../../utils/storage');
const { saveImageFromUrl } = require('../../utils/save-image');
const { getFlowDraft } = require('../../utils/flow-draft');
const { request } = require('../../utils/request');
const { pickBestImageUrl: pickImageFromCandidates } = require('../../utils/image-url');
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

const ENGINEERING_HINT_PATTERN = /(engine|backend|compare|fallback|legacy|baidu|debug|trace|pipeline)/i;

function getApiBaseUrl() {
  const app = getApp();
  return (app && app.globalData && app.globalData.apiBaseUrl) || '';
}

function sanitizeHintText(text = '', fallback = '') {
  const normalized = String(text || '').trim();
  if (!normalized) return fallback;
  if (ENGINEERING_HINT_PATTERN.test(normalized)) return fallback;
  return normalized;
}

function normalizeCandidateWarnings(candidate = {}) {
  const warnings = Array.isArray(candidate.warnings) ? candidate.warnings : [];
  const riskTips = Array.isArray(candidate.riskTips) ? candidate.riskTips : [];
  const details = Array.isArray(candidate.details) ? candidate.details : [];
  return getFriendlyWarnings([...warnings, ...riskTips, ...details])
    .map((item) => sanitizeHintText(item, '建议放大查看细节后再决定'))
    .filter(Boolean);
}

function normalizeCandidates(result = {}) {
  const sourceList = Array.isArray(result.candidates) ? result.candidates : [];
  const candidates = sourceList
    .map((candidate, index) => {
      const candidateId = candidate.candidateId || candidate.candidate_id || '';
      const label = sanitizeHintText(candidate.label, '') || `方案 ${index === 0 ? 'A' : 'B'}`;
      const imageUrl = pickImageFromCandidates([
        candidate.imageUrl,
        candidate.image_url,
        candidate.previewUrl,
        candidate.preview_url,
        candidate.resultUrl,
        candidate.result_url,
        candidate.hdUrl,
        candidate.hd_url
      ]);
      const qualityMessage = sanitizeHintText(
        candidate.qualityMessage || candidate.quality_message || candidate.message || '',
        '建议放大查看细节后再保存'
      );
      const warnings = normalizeCandidateWarnings(candidate);

      return {
        ...candidate,
        candidateId,
        label,
        imageUrl,
        qualityMessage,
        warnings,
        fallbackText: `${label}加载失败，请稍后重试`
      };
    })
    .filter((candidate) => candidate.imageUrl);

  if (candidates.length >= 2) {
    return candidates.slice(0, 2);
  }

  const legacyFallback = [
    {
      candidateId: 'legacy_a',
      label: '方案 A',
      imageUrl: result.previewUrl || result.preview_url || result.displayUrl || '',
      qualityMessage: '建议放大查看边缘效果后再保存',
      warnings: []
    },
    {
      candidateId: 'legacy_b',
      label: '方案 B',
      imageUrl: result.hdUrl || result.hd_url || result.resultUrl || result.result_url || '',
      qualityMessage: '建议检查衣领与头发细节后再保存',
      warnings: []
    }
  ].filter((item) => item.imageUrl);

  const merged = [...candidates, ...legacyFallback].slice(0, 2);
  return merged.map((item, index) => ({
    ...item,
    candidateId: item.candidateId || `candidate_${index + 1}`,
    label: item.label || `方案 ${index === 0 ? 'A' : 'B'}`,
    fallbackText: `${item.label || `方案 ${index === 0 ? 'A' : 'B'}`}加载失败，请稍后重试`
  }));
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
  return getFriendlyWarnings([...warnings, ...riskTips, ...details])
    .map((item) => sanitizeHintText(item, '建议检查细节后再保存'))
    .filter(Boolean);
}

function normalizeResult(result = {}) {
  const warnings = normalizeWarnings(result);
  const friendlyName = getFriendlySceneName(result, '证件照');
  const sceneHint = getFriendlySceneHint(result);
  const reviewState = deriveDisplayState(result);
  const summary = getFriendlyStatusSummary(reviewState);
  const qualityText = reviewState === 'failed'
    ? '不建议直接使用'
    : getFriendlyStatusText(result.qualityStatus || result.status || (reviewState === 'warning' ? 'WARNING' : 'SUCCESS'));
  const layoutUrl = result.printLayoutUrl || result.layoutUrl || '';
  const candidates = normalizeCandidates(result);
  const displayUrl = pickImageFromCandidates([
    candidates[0] && candidates[0].imageUrl,
    candidates[1] && candidates[1].imageUrl,
    result.displayUrl,
    pickBestImageUrl(result)
  ]);

  return {
    ...result,
    warnings,
    candidates,
    sceneName: friendlyName,
    sceneHint,
    sizeText: getFriendlySizeText(result),
    qualityText,
    reviewState,
    statusSummary: summary,
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
    selectedCandidateId: '',
    imageFailMap: {}
  },

  onShow() {
    const rawResult = storage.get(STORAGE_KEYS.CURRENT_RESULT, null) || MOCK_RESULT;
    const draft = getFlowDraft();
    const normalized = normalizeResult({
      ...rawResult,
      sourceImageUrl: rawResult.sourceImageUrl || draft.sourceImageUrl || draft.sourceImagePath || '',
      displayUrl: pickBestImageUrl(rawResult)
    });

    this.setData({
      result: normalized,
      selectedCandidateId: '',
      imageFailMap: {}
    });
  },

  handleCandidateImageError(event) {
    const candidateId = event.currentTarget.dataset.candidateId;
    if (!candidateId) return;
    this.setData({
      [`imageFailMap.${candidateId}`]: true
    });
  },

  selectCandidate(event) {
    const candidateId = event.currentTarget.dataset.candidateId;
    if (!candidateId) return;
    this.setData({ selectedCandidateId: candidateId });
  },

  async saveAsset(url, options = {}) {
    await saveImageFromUrl(url, options);
  },

  async confirmSaveSelection(taskId, candidateId) {
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl || !taskId || !candidateId) return;
    await request(`${apiBaseUrl}/photo/tasks/${taskId}/confirm`, 'POST', {
      taskId,
      candidateId
    }, {
      showLoading: false,
      showErrorToast: false
    });
  },

  async saveSelectedCandidate() {
    const { result, selectedCandidateId } = this.data;
    if (!selectedCandidateId) {
      wx.showToast({ title: '请先选择要保存的图片', icon: 'none' });
      return;
    }

    const selectedCandidate = (result && Array.isArray(result.candidates)
      ? result.candidates.find((item) => item.candidateId === selectedCandidateId)
      : null) || null;

    if (!selectedCandidate || !selectedCandidate.imageUrl) {
      wx.showToast({ title: '当前图片暂不可保存，请稍后重试', icon: 'none' });
      return;
    }

    try {
      await this.confirmSaveSelection(result.taskId, selectedCandidate.candidateId);
      await this.saveAsset(selectedCandidate.imageUrl, {
        loadingText: '正在保存图片',
        successText: '图片已保存到相册'
      });
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败，请稍后重试', icon: 'none' });
    }
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
