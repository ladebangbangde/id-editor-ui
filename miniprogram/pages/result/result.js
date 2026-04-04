const { STORAGE_KEYS, MOCK_RESULT } = require('../../utils/constants');
const storage = require('../../utils/storage');
const { saveImageFromUrl } = require('../../utils/save-image');
const { getFlowDraft } = require('../../utils/flow-draft');
const { pickBestImageUrl: pickImageFromCandidates } = require('../../utils/image-url');
const { getPreviewImage, getHdImage } = require('../../utils/image-resource');
const { getCache, setCache } = require('../../utils/page-cache');
const { withSubmitLock } = require('../../utils/submit-lock');
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

function isDevMode() {
  const wxConfig = typeof __wxConfig !== 'undefined' ? __wxConfig : null;
  if (wxConfig && wxConfig.envVersion === 'develop') return true;
  const app = getApp();
  return Boolean(app && app.globalData && app.globalData.env === 'development');
}

function debugLog(tag, payload) {
  if (!isDevMode()) return;
  console.log(`[result.debug] ${tag}`, payload);
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
  debugLog('raw candidates', sourceList);
  const candidates = sourceList
    .map((candidate, index) => {
      const candidateId = String(candidate.candidateId || candidate.candidate_id || `candidate_${index + 1}`).trim();
      const label = sanitizeHintText(candidate.label, '') || `方案 ${index === 0 ? 'A' : 'B'}`;
      const imageUrl = pickImageFromCandidates([
        candidate.resultUrl,
        candidate.result_url,
        candidate.hdUrl,
        candidate.hd_url,
        candidate.imageUrl,
        candidate.image_url,
        candidate.previewUrl,
        candidate.preview_url
      ]);
      const hdUrl = pickImageFromCandidates([
        candidate.hdUrl,
        candidate.hd_url,
        candidate.resultUrl,
        candidate.result_url,
        candidate.imageUrl,
        candidate.image_url
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
        previewUrl: pickImageFromCandidates([
          candidate.resultUrl,
          candidate.result_url,
          candidate.hdUrl,
          candidate.hd_url,
          candidate.imageUrl,
          candidate.image_url,
          candidate.previewUrl,
          candidate.preview_url
        ]),
        hdUrl,
        qualityMessage,
        warnings,
        fallbackText: `${label}加载失败或暂未生成，请稍后重试`
      };
    })
    .filter((candidate) => candidate.imageUrl);

  const topLevelFallback = [
    {
      candidateId: 'fallback_preview',
      label: '方案 A',
      imageUrl: result.resultUrl || result.result_url || result.hdUrl || result.hd_url || result.previewUrl || result.preview_url || result.displayUrl || '',
      previewUrl: result.previewUrl || result.preview_url || result.resultUrl || result.result_url || result.displayUrl || '',
      hdUrl: result.hdUrl || result.hd_url || result.resultUrl || result.result_url || '',
      qualityMessage: '建议放大查看边缘效果后再保存',
      warnings: []
    },
    {
      candidateId: 'fallback_hd',
      label: '方案 B',
      imageUrl: result.hdUrl || result.hd_url || result.resultUrl || result.result_url || '',
      previewUrl: result.previewUrl || result.preview_url || result.displayUrl || '',
      hdUrl: result.hdUrl || result.hd_url || result.resultUrl || result.result_url || '',
      qualityMessage: '建议检查衣领与头发细节后再保存',
      warnings: []
    }
  ]
    .filter((item) => item.imageUrl)
    .map((item) => ({
      ...item,
      fallbackText: `${item.label}加载失败或暂未生成，请稍后重试`
    }));

  const merged = [...candidates];
  if (merged.length < 2) {
    topLevelFallback.forEach((item) => {
      const exists = merged.some((candidate) => candidate.imageUrl === item.imageUrl);
      if (!exists && merged.length < 2) {
        merged.push(item);
      }
    });
  }

  const seenImageUrls = new Set();
  const uniqueCandidates = merged.filter((item) => {
    const imageUrl = item && item.imageUrl;
    if (!imageUrl) return false;
    if (seenImageUrls.has(imageUrl)) return false;
    seenImageUrls.add(imageUrl);
    return true;
  });

  debugLog('dedup candidate urls', uniqueCandidates.map((item) => item.imageUrl));

  const cards = uniqueCandidates.slice(0, 2).map((item, index) => ({
    ...item,
    label: `方案 ${index === 0 ? 'A' : 'B'}`,
    candidateId: item.candidateId || `candidate_${index + 1}`,
    fallbackText: item.fallbackText || `方案 ${index === 0 ? 'A' : 'B'}加载失败或暂未生成，请稍后重试`
  }));

  debugLog('final candidate cards', cards.map((item) => ({
    slot: item.slot,
    candidateId: item.candidateId,
    label: item.label,
    imageUrl: item.imageUrl,
    hdUrl: item.hdUrl
  })));

  return cards;
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
  const leftCard = candidates[0] || null;
  const rightCard = candidates[1] || null;
  const displayUrl = pickImageFromCandidates([
    leftCard && leftCard.previewUrl,
    rightCard && rightCard.previewUrl,
    getPreviewImage(result),
    result.displayUrl,
    pickBestImageUrl(result)
  ]);
  debugLog('render urls', {
    left: leftCard ? { candidateId: leftCard.candidateId, imageUrl: leftCard.imageUrl, hdUrl: leftCard.hdUrl } : null,
    right: rightCard ? { candidateId: rightCard.candidateId, imageUrl: rightCard.imageUrl, hdUrl: rightCard.hdUrl } : null
  });

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
    imageFailMap: {},
    savingCandidate: false,
    savingLayout: false
  },

  onShow() {
    const rawResult = storage.get(STORAGE_KEYS.CURRENT_RESULT, null) || MOCK_RESULT;
    const draft = getFlowDraft();
    const cacheKey = `result:${rawResult.taskId || rawResult.imageId || 'latest'}`;
    const cached = getCache(cacheKey);
    const normalized = cached || normalizeResult({
      ...rawResult,
      sourceImageUrl: rawResult.sourceImageUrl || draft.sourceImageUrl || draft.sourceImagePath || '',
      displayUrl: getPreviewImage(rawResult)
    });

    if (!cached) {
      setCache(cacheKey, normalized, 45000);
    }

    const defaultSelected = (normalized.candidates.find((item) => item.imageUrl) || {}).candidateId || '';

    this.setData({
      result: normalized,
      selectedCandidateId: this.data.selectedCandidateId || defaultSelected,
      imageFailMap: {},
      savingCandidate: false,
      savingLayout: false
    });

    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  buildSharePayload() {
    const { result, selectedCandidateId } = this.data;
    const candidates = result && Array.isArray(result.candidates) ? result.candidates : [];
    const selectedCandidate = candidates.find((item) => item && item.candidateId === selectedCandidateId) || candidates[0] || null;
    const sceneName = (result && result.sceneName) || '证件照';
    const sizeText = (result && result.sizeText) || '';
    const title = sizeText
      ? `我刚用棒棒证件照生成了${sceneName}（${sizeText}）`
      : `我刚用棒棒证件照生成了一张标准${sceneName}`;
    const imageUrl = pickImageFromCandidates([
      selectedCandidate && (selectedCandidate.previewUrl || selectedCandidate.imageUrl || selectedCandidate.hdUrl),
      result && result.displayUrl,
      selectedCandidate && selectedCandidate.hdUrl,
      result && (result.previewUrl || result.resultUrl || result.hdUrl)
    ]);

    return {
      title,
      path: '/pages/home/home?from=share_result',
      imageUrl
    };
  },

  onShareAppMessage() {
    const payload = this.buildSharePayload();
    return {
      title: payload.title || '我刚用棒棒证件照生成了一张标准证件照',
      path: payload.path || '/pages/home/home',
      imageUrl: payload.imageUrl || undefined
    };
  },

  onShareTimeline() {
    const payload = this.buildSharePayload();
    return {
      title: payload.title || '棒棒证件照｜一键生成规范证件照',
      query: 'from=share_timeline_result',
      imageUrl: payload.imageUrl || undefined
    };
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

  async saveSelectedCandidate() {
    return withSubmitLock(this, 'savingCandidate', async () => {
      const { result, selectedCandidateId } = this.data;
    if (!selectedCandidateId) {
      wx.showToast({ title: '请先选择要保存的图片', icon: 'none' });
      return;
    }

    const selectedCandidate = (result && Array.isArray(result.candidates)
      ? result.candidates.find((item) => item.candidateId === selectedCandidateId)
      : null) || null;

    const selectedImageUrl = selectedCandidate && getHdImage(selectedCandidate);

    if (!selectedCandidate || !selectedImageUrl) {
      wx.showToast({ title: '当前图片暂不可保存，请稍后重试', icon: 'none' });
      return;
    }

      try {
        await this.saveAsset(selectedImageUrl, {
          loadingText: '正在保存图片',
          successText: '图片已保存到相册'
        });
      } catch (error) {
        wx.showToast({ title: error.message || '保存失败，请稍后重试', icon: 'none' });
      }
    });
  },

  async saveLayout() {
    return withSubmitLock(this, 'savingLayout', async () => {
      const { result } = this.data;
      await this.saveAsset(result && (result.printLayoutUrl || result.layoutUrl), {
        emptyText: '这次结果里还没有排版图',
        loadingText: '正在保存排版图',
        successText: '排版图已保存到相册'
      });
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
