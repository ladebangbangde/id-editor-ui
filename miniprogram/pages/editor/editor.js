const { getColorLabel, formatTime } = require('../../utils/format');
const { getFriendlySceneName, getFriendlySizeText } = require('../../utils/photo-display');
const { createPhotoTask, getPhotoTask } = require('../../utils/api');
const { createTaskPoller, resolveProgressByStage, normalizeStageCode } = require('../../utils/task-progress');
const storage = require('../../utils/storage');
const { STORAGE_KEYS } = require('../../utils/constants');
const { getFlowDraft, setFlowDraft } = require('../../utils/flow-draft');
const { toCanonicalSizeCode } = require('../../utils/size-codes');

const ALLOWED_BACKGROUND_COLORS = ['blue', 'white', 'red'];
const POLL_TIMEOUT_MS = 120000;
const SUCCESS_STAY_MS = 800;

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

function normalizeProcessingCandidates(result = {}) {
  const list = Array.isArray(result.candidates) ? result.candidates : [];
  return list
    .map((item, index) => {
      const candidateId = item.candidateId || item.candidate_id || '';
      const label = item.label || `方案 ${index === 0 ? 'A' : 'B'}`;
      const imageUrl = item.imageUrl || item.image_url || item.previewUrl || item.preview_url
        || item.resultUrl || item.result_url || item.hdUrl || item.hd_url || '';
      return {
        ...item,
        candidateId,
        label,
        imageUrl
      };
    })
    .filter((item) => item.imageUrl);
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

function normalizeBackgroundColor(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const lowered = raw.toLowerCase();
  if (ALLOWED_BACKGROUND_COLORS.includes(lowered)) return lowered;
  if (raw === '白色') return 'white';
  if (raw === '蓝色') return 'blue';
  if (raw === '红色') return 'red';
  return '';
}

Page({
  data: {
    draft: {},
    selectedColor: 'white',
    generating: false,
    progressVisible: false,
    progressStatus: 'init',
    progressStageCode: 'received',
    progressValue: 5,
    elapsedSeconds: 0,
    progressErrorMessage: ''
  },

  onShow() {
    const draft = getFlowDraft();
    const selectedColor = draft.backgroundColor || 'white';
    this.setData({ draft, selectedColor });
  },

  onHide() {
    this.clearProgressRuntime();
  },

  onUnload() {
    this.clearProgressRuntime();
  },

  onColorChange(event) {
    const selectedColor = event.detail.value;
    this.setData({ selectedColor });
    setFlowDraft({ backgroundColor: selectedColor });
  },

  onRetryGenerate() {
    if (this.data.generating) return;
    this.handleGenerate();
  },

  goSelectSize() {
    wx.navigateTo({ url: '/pages/custom-size/custom-size' });
  },

  async refreshTaskResult(taskId, fallbackResult = {}) {
    if (!taskId) return fallbackResult;
    try {
      const latest = await getPhotoTask(taskId);
      if (latest) return latest;
    } catch (error) {
      // ignore refresh failure
    }
    return fallbackResult;
  },

  clearProgressRuntime() {
    if (this.taskPoller) {
      this.taskPoller.stop();
      this.taskPoller = null;
    }
    if (this.elapsedTimer) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }
    this.taskStartedAt = 0;
  },

  showProgressModal() {
    this.setData({
      progressVisible: true,
      progressStatus: 'processing',
      progressStageCode: 'received',
      progressValue: 5,
      elapsedSeconds: 0,
      progressErrorMessage: ''
    });
  },

  startElapsedTicker() {
    if (this.elapsedTimer) {
      clearInterval(this.elapsedTimer);
    }
    this.elapsedTimer = setInterval(() => {
      if (!this.taskStartedAt) return;
      const elapsedSeconds = Math.floor((Date.now() - this.taskStartedAt) / 1000);
      if (elapsedSeconds !== this.data.elapsedSeconds) {
        this.setData({ elapsedSeconds });
      }
    }, 1000);
  },

  updateProgressState(task = {}) {
    const stageCode = normalizeStageCode(task.stageCode || task.stage);
    if (!stageCode) return;

    const targetProgress = resolveProgressByStage(stageCode, this.data.progressValue);
    const safeProgress = Math.max(this.data.progressValue, targetProgress);

    this.setData({
      progressStatus: 'processing',
      progressStageCode: stageCode,
      progressValue: safeProgress,
      elapsedSeconds: typeof task.elapsedSeconds === 'number' ? task.elapsedSeconds : this.data.elapsedSeconds
    });
  },

  async finalizeSuccess(taskSnapshot, draft, normalizedBackgroundColor, canonicalSizeCode) {
    const latestResult = await this.refreshTaskResult(taskSnapshot.taskId, taskSnapshot);
    const sceneInfo = draft.selectedScene || {};
    const mergedRiskWarnings = mergeRiskWarnings(latestResult);
    const qualityMessage = latestResult.qualityMessage || latestResult.message || '';
    const result = {
      imagePath: draft.sourceImagePath,
      sourceImagePath: draft.sourceImagePath,
      sourceImageUrl: draft.sourceImageUrl || draft.sourceImagePath,
      sceneInfo,
      sceneName: getFriendlySceneName({ sceneKey: sceneInfo.sceneKey, sceneName: sceneInfo.sceneName }, '证件照'),
      sizeText: getFriendlySizeText(sceneInfo),
      taskId: latestResult.taskId || taskSnapshot.taskId || '',
      status: latestResult.status || 'success',
      previewUrl: latestResult.previewUrl || '',
      resultUrl: latestResult.resultUrl || '',
      backgroundColor: latestResult.backgroundColor || normalizedBackgroundColor,
      backgroundColorLabel: getColorLabel(latestResult.backgroundColor || normalizedBackgroundColor),
      sizeCode: latestResult.sizeCode || canonicalSizeCode,
      width: latestResult.width || sceneInfo.pixelWidth || 0,
      height: latestResult.height || sceneInfo.pixelHeight || 0,
      warnings: mergedRiskWarnings,
      qualityStatus: latestResult.qualityStatus || '',
      qualityMessage,
      createdAt: latestResult.createdAt || formatTime(Date.now()),
      hdUrl: latestResult.hdUrl || latestResult.resultUrl || '',
      candidates: normalizeProcessingCandidates(latestResult),
      code: latestResult.code || '',
      message: latestResult.message || '',
      details: latestResult.details || [],
      riskTips: latestResult.riskTips || []
    };

    const reviewState = deriveReviewState(result);
    if (reviewState === 'failed') {
      const failurePayload = buildFailurePayload({
        ...result,
        reasons: result.details,
        warnings: mergedRiskWarnings,
        suggestions: result.riskTips
      });
      storage.set(STORAGE_KEYS.CURRENT_PROCESS_FAILURE, failurePayload);
      this.setData({ progressVisible: false });
      wx.navigateTo({ url: '/pages/process-failure/process-failure' });
      return;
    }

    storage.set(STORAGE_KEYS.CURRENT_RESULT, result);
    this.setData({ progressVisible: false });
    wx.navigateTo({ url: '/pages/result/result' });
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

    const normalizedBackgroundColor = normalizeBackgroundColor(selectedColor || draft.backgroundColor);
    if (!normalizedBackgroundColor) {
      wx.showToast({ title: '背景色参数不合法，请重新选择', icon: 'none' });
      return;
    }

    const selectedSizeCode = draft.selectedSizeCode || (draft.selectedScene && draft.selectedScene.sceneKey) || '';
    const canonicalSizeCode = toCanonicalSizeCode(selectedSizeCode)
      || (draft.selectedSizeCode === 'custom' ? 'one_inch' : '');
    if (!canonicalSizeCode) {
      wx.showToast({ title: '当前尺寸暂不支持，请更换尺寸', icon: 'none' });
      return;
    }

    this.setData({ generating: true });
    setFlowDraft({
      backgroundColor: normalizedBackgroundColor,
      flowType: 'idPhoto'
    });

    if (draft.selectedSizeCode === 'custom') {
      wx.showToast({ title: '当前先按一寸规格生成', icon: 'none' });
    }

    this.showProgressModal();
    this.taskStartedAt = Date.now();
    this.startElapsedTicker();

    try {
      const processFormData = {
        sizeCode: canonicalSizeCode,
        backgroundColor: normalizedBackgroundColor,
        enhance: false
      };
      const createdTask = await createPhotoTask(draft.sourceImagePath, processFormData);
      const taskId = createdTask.taskId;
      if (!taskId) {
        throw new Error('任务创建失败，请重试');
      }

      this.updateProgressState({
        stageCode: createdTask.stageCode || 'received',
        elapsedSeconds: 0
      });

      this.taskPoller = createTaskPoller({
        fetchTask: getPhotoTask,
        timeout: POLL_TIMEOUT_MS,
        onUpdate: (snapshot) => {
          this.updateProgressState(snapshot);
        },
        onTimeout: (snapshot) => {
          this.setData({
            progressStatus: 'timeout',
            progressStageCode: snapshot.stageCode || this.data.progressStageCode,
            progressErrorMessage: '等待时间较长，请重试。',
            progressValue: snapshot.progress || this.data.progressValue
          });
        }
      });

      const pollResult = await this.taskPoller.start(taskId, createdTask);

      if (pollResult.status === 'failed') {
        this.setData({
          progressStatus: 'failed',
          progressStageCode: pollResult.stageCode || this.data.progressStageCode,
          progressErrorMessage: pollResult.message || '处理失败，请重试。',
          progressValue: pollResult.progress || this.data.progressValue
        });
        return;
      }

      if (pollResult.status === 'timeout') {
        return;
      }

      this.setData({
        progressStatus: 'success',
        progressStageCode: 'success',
        progressValue: 100
      });

      await new Promise((resolve) => setTimeout(resolve, SUCCESS_STAY_MS));
      await this.finalizeSuccess(pollResult, draft, normalizedBackgroundColor, canonicalSizeCode);
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

      this.setData({
        progressStatus: 'failed',
        progressErrorMessage: failurePayload.message || '生成失败，请重试'
      });

      if (hasFailureDetails) {
        storage.set(STORAGE_KEYS.CURRENT_PROCESS_FAILURE, failurePayload);
      }
    } finally {
      this.clearProgressRuntime();
      this.setData({ generating: false });
    }
  }
});
