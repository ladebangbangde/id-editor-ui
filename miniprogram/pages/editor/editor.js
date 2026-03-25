const { getColorLabel, formatTime } = require('../../utils/format');
const { getFriendlySceneName, getFriendlySizeText } = require('../../utils/photo-display');
const { processPhoto, getPhotoTask } = require('../../utils/api');
const storage = require('../../utils/storage');
const { STORAGE_KEYS } = require('../../utils/constants');
const { getFlowDraft, setFlowDraft } = require('../../utils/flow-draft');
const { toCanonicalSizeCode } = require('../../utils/size-codes');

function normalizeWarnings(warnings) {
  return Array.isArray(warnings) ? warnings.filter(Boolean) : [];
}

function normalizeDetailList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return item;
      if (typeof item === 'object') return item.message || item.detail || item.title || '';
      return '';
    })
    .filter(Boolean);
}

function mergeRiskWarnings(result = {}) {
  return normalizeWarnings([
    ...(Array.isArray(result.warnings) ? result.warnings : []),
    ...(Array.isArray(result.riskTips) ? result.riskTips : []),
    ...normalizeDetailList(result.details)
  ]);
}

function normalizeSuggestionList(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return item;
      if (typeof item === 'object') return item.title || item.detail || item.message || '';
      return String(item || '');
    })
    .filter(Boolean);
}

function buildFailurePayload(payload = {}, fallback = {}) {
  const reasons = normalizeDetailList(
    payload.reasons
      || (payload.data && payload.data.reasons)
      || (payload.data && payload.data.data && payload.data.data.reasons)
      || []
  );
  const warnings = normalizeSuggestionList(
    payload.warnings
      || (payload.data && payload.data.warnings)
      || (payload.data && payload.data.data && payload.data.data.warnings)
      || []
  );
  const suggestions = normalizeSuggestionList(
    payload.suggestions
      || (payload.data && payload.data.suggestions)
      || (payload.data && payload.data.data && payload.data.data.suggestions)
      || []
  );
  const message = payload.message
    || payload.qualityMessage
    || (payload.error && payload.error.message)
    || fallback.message
    || '请根据以下原因调整后重新上传';

  return {
    title: '照片不符合证件照要求',
    subtitle: '请根据以下原因调整后重新上传',
    message,
    code: payload.code || fallback.code || '',
    taskId: payload.taskId || fallback.taskId || '',
    reasons,
    warnings,
    suggestions,
    createdAt: payload.createdAt || fallback.createdAt || formatTime(Date.now())
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

Page({
  data: {
    draft: {},
    selectedColor: 'white',
    generating: false
  },

  onShow() {
    const draft = getFlowDraft();
    const selectedColor = draft.backgroundColor || 'white';
    this.setData({ draft, selectedColor });
  },

  onColorChange(event) {
    const selectedColor = event.detail.value;
    this.setData({ selectedColor });
    setFlowDraft({ backgroundColor: selectedColor });
  },


  goSelectSize() {
    wx.navigateTo({ url: '/pages/custom-size/custom-size' });
  },

  async refreshTaskResult(taskId, fallbackResult = {}) {
    if (!taskId) return fallbackResult;
    try {
      const latest = await getPhotoTask(taskId);
      if (latest && (latest.previewUrl || latest.resultUrl)) return latest;
    } catch (error) {
      // ignore refresh failure
    }
    return fallbackResult;
  },

  async handleGenerate() {
    const { generating, selectedColor, draft } = this.data;
    if (generating) return;
    if (!draft.sourceImagePath) {
      wx.showToast({ title: '请先上传原图', icon: 'none' });
      return;
    }
    if (!draft.selectedScene) {
      wx.showToast({ title: '请先选择尺寸', icon: 'none' });
      return;
    }

    this.setData({ generating: true });
    setFlowDraft({
      backgroundColor: selectedColor,
      flowType: 'idPhoto'
    });

    try {
      const canonicalSizeCode = toCanonicalSizeCode(draft.selectedSizeCode || draft.selectedScene.sceneKey)
        || (draft.selectedSizeCode === 'custom' ? 'one_inch' : '');
      if (!canonicalSizeCode) {
        wx.showToast({ title: '当前尺寸暂不支持，请更换尺寸', icon: 'none' });
        return;
      }
      if (draft.selectedSizeCode === 'custom') {
        // TODO(server): 服务端支持完全自定义尺寸后，改为透传 customSize 生成而非一寸兜底。
        wx.showToast({ title: '当前先按一寸规格生成', icon: 'none' });
      }
      const processed = await processPhoto(draft.sourceImagePath, {
        sizeCode: canonicalSizeCode,
        backgroundColor: selectedColor,
        enhance: false
      });
      const latestResult = await this.refreshTaskResult(processed.taskId, processed);
      const sceneInfo = draft.selectedScene || {};
      const mergedRiskWarnings = mergeRiskWarnings({
        ...processed,
        ...latestResult
      });
      const qualityMessage = latestResult.qualityMessage
        || processed.qualityMessage
        || latestResult.message
        || processed.message
        || '';
      const result = {
        imagePath: draft.sourceImagePath,
        sourceImagePath: draft.sourceImagePath,
        sourceImageUrl: draft.sourceImageUrl || draft.sourceImagePath,
        sceneInfo,
        sceneName: getFriendlySceneName({ sceneKey: sceneInfo.sceneKey, sceneName: sceneInfo.sceneName }, '证件照'),
        sizeText: getFriendlySizeText(sceneInfo),
        taskId: latestResult.taskId || processed.taskId || '',
        status: latestResult.status || processed.status || '',
        previewUrl: latestResult.previewUrl || processed.previewUrl || '',
        resultUrl: latestResult.resultUrl || processed.resultUrl || '',
        backgroundColor: latestResult.backgroundColor || processed.backgroundColor || selectedColor,
        backgroundColorLabel: getColorLabel(latestResult.backgroundColor || processed.backgroundColor || selectedColor),
        sizeCode: latestResult.sizeCode || processed.sizeCode || canonicalSizeCode,
        width: latestResult.width || processed.width || sceneInfo.pixelWidth || 0,
        height: latestResult.height || processed.height || sceneInfo.pixelHeight || 0,
        warnings: mergedRiskWarnings,
        qualityStatus: latestResult.qualityStatus || processed.qualityStatus || '',
        qualityMessage,
        createdAt: latestResult.createdAt || formatTime(Date.now()),
        hdUrl: latestResult.hdUrl || processed.hdUrl || latestResult.resultUrl || processed.resultUrl || '',
        code: latestResult.code || processed.code || '',
        message: latestResult.message || processed.message || '',
        details: latestResult.details || processed.details || [],
        riskTips: latestResult.riskTips || processed.riskTips || []
      };
      const reviewState = deriveReviewState(result);
      console.log('[editor] generation raw result', { processed, latestResult });
      console.log('[editor] generation mapped status', {
        reviewState,
        qualityStatus: result.qualityStatus,
        status: result.status,
        code: result.code,
        warnings: result.warnings,
        message: result.message
      });

      if (reviewState === 'failed') {
        const failurePayload = buildFailurePayload({
          ...result,
          reasons: result.details,
          warnings: mergedRiskWarnings,
          suggestions: result.riskTips
        });
        storage.set(STORAGE_KEYS.CURRENT_PROCESS_FAILURE, failurePayload);
        wx.navigateTo({ url: '/pages/process-failure/process-failure' });
        return;
      }
      storage.set(STORAGE_KEYS.CURRENT_RESULT, result);
      wx.navigateTo({ url: '/pages/result/result' });
    } catch (error) {
      const failurePayload = buildFailurePayload(error, {
        message: '生成失败，请重试'
      });
      const hasBusinessContent = Boolean(error && (
        error.isBusinessError
        || error.success === false
        || typeof error.code !== 'undefined'
        || (error.data && typeof error.data === 'object')
      ));
      const hasFailureDetails = hasBusinessContent || failurePayload.reasons.length
        || failurePayload.warnings.length
        || failurePayload.suggestions.length;

      if (hasFailureDetails) {
        // 兼容 HTTP 非 200 但响应体携带业务失败详情的场景，统一进入失败结果页。
        storage.set(STORAGE_KEYS.CURRENT_PROCESS_FAILURE, failurePayload);
        wx.navigateTo({ url: '/pages/process-failure/process-failure' });
        return;
      }
      wx.showToast({ title: error.message || '生成失败，请重试', icon: 'none' });
    } finally {
      this.setData({ generating: false });
    }
  }
});
