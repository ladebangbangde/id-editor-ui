const { getColorLabel, formatTime } = require('../../utils/format');
const { getFriendlySceneName, getFriendlySizeText } = require('../../utils/photo-display');
const { createPhotoTask, getPhotoTask, getPhotoTaskStatus } = require('../../utils/api');
const { createTaskPoller, resolveProgressByStage, normalizeStageCode } = require('../../utils/task-progress');
const storage = require('../../utils/storage');
const { STORAGE_KEYS } = require('../../utils/constants');
const { getFlowDraft, setFlowDraft } = require('../../utils/flow-draft');
const {
  normalizeBackgroundColorForApi,
  getBackgroundColorLabel,
  normalizeSizeCodeForApi,
  normalizeEditDraftToPhotoRequest
} = require('../../utils/photo-edit-contract');

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

function normalizeRemakeCandidates(list = []) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item, index) => {
      const imageUrl = item.imageUrl || item.previewUrl || item.resultUrl || item.hdUrl || '';
      if (!imageUrl) return null;
      const source = String(item.source || '').toLowerCase();
      const sourceLabel = item.sourceLabel
        || (source === 'baidu' ? '百度方案' : ((source === 'local' || source === 'legacy') ? '本地方案' : `候选方案${index + 1}`));
      return {
        candidateId: item.candidateId || `candidate_${index + 1}`,
        source,
        sourceLabel,
        imageUrl,
        previewUrl: item.previewUrl || imageUrl,
        resultUrl: item.resultUrl || imageUrl,
        hdUrl: item.hdUrl || item.resultUrl || imageUrl
      };
    })
    .filter(Boolean)
    .slice(0, 2);
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
    generating: false,
    progressVisible: false,
    progressStatus: 'init',
    progressStageCode: '',
    progressStageName: '',
    progressStageDescription: '',
    progressValue: 5,
    elapsedSeconds: 0,
    progressErrorMessage: '',
    isHistoryRemake: false,
    remakeCandidates: [],
    remakeSelectedCandidateId: '',
    remakeDisplayImageUrl: ''
  },

  onShow() {
    const draft = getFlowDraft();
    const selectedColor = normalizeBackgroundColorForApi(draft.backgroundColor) || 'white';
    const remakeCandidates = normalizeRemakeCandidates(draft.remakeCandidates || draft.candidates || []);
    const isHistoryRemake = Boolean(draft.fromHistoryTaskId);
    const remakeSelectedCandidateId = draft.remakeSelectedCandidateId
      || (remakeCandidates[0] && remakeCandidates[0].candidateId)
      || '';
    const selectedCandidate = remakeCandidates.find((item) => item.candidateId === remakeSelectedCandidateId) || null;
    const remakeDisplayImageUrl = (selectedCandidate && selectedCandidate.imageUrl)
      || draft.sourceImagePath
      || draft.sourceImageUrl
      || '';
    const canonicalSizeCode = normalizeSizeCodeForApi(draft);
    const backgroundColorLabel = getBackgroundColorLabel(selectedColor);

    if (isHistoryRemake) {
      wx.setNavigationBarTitle({ title: '重新编辑证件照' });
    } else {
      wx.setNavigationBarTitle({ title: '编辑证件照' });
    }

    this.setData({
      draft,
      selectedColor,
      isHistoryRemake,
      remakeCandidates,
      remakeSelectedCandidateId,
      remakeDisplayImageUrl,
      generating: false,
      progressVisible: false,
      progressStatus: 'init',
      progressStageCode: '',
      progressStageName: '',
      progressStageDescription: '',
      progressValue: 5,
      elapsedSeconds: 0,
      progressErrorMessage: ''
    });

    if (isHistoryRemake) {
      setFlowDraft({
        remakeSelectedCandidateId,
        selectedCandidateId: remakeSelectedCandidateId,
        selectedSizeCode: draft.selectedSizeCode || canonicalSizeCode,
        backgroundColor: selectedColor,
        backgroundColorLabel,
        remakeBackgroundColorLabel: backgroundColorLabel,
        sourceImageUrl: (selectedCandidate && selectedCandidate.imageUrl) || draft.sourceImageUrl || '',
        sourceImagePath: draft.sourceImagePath || ''
      });
    }
  },

  onHide() {
    this.clearProgressRuntime();
    this.setData({
      generating: false,
      progressVisible: false
    });
  },

  onUnload() {
    this.clearProgressRuntime();
  },

  onColorChange(event) {
    const selectedColor = event.detail.value;
    this.setData({ selectedColor });
    setFlowDraft({
      backgroundColor: normalizeBackgroundColorForApi(selectedColor),
      backgroundColorLabel: getBackgroundColorLabel(selectedColor),
      remakeBackgroundColorLabel: getBackgroundColorLabel(selectedColor)
    });
  },

  onSelectRemakeCandidate(event) {
    const { candidateId } = event.currentTarget.dataset;
    if (!candidateId) return;
    const selectedCandidate = this.data.remakeCandidates.find((item) => item.candidateId === candidateId);
    if (!selectedCandidate) return;
    this.setData({
      remakeSelectedCandidateId: candidateId,
      remakeDisplayImageUrl: selectedCandidate.imageUrl
    });
    setFlowDraft({
      remakeSelectedCandidateId: candidateId,
      selectedCandidateId: candidateId,
      sourceImageUrl: selectedCandidate.imageUrl,
      sourceImagePath: ''
    });
  },

  onRetryGenerate() {
    if (this.data.generating) return;
    this.handleGenerate();
  },

  goSelectSize() {
    wx.navigateTo({ url: '/pages/custom-size/custom-size' });
  },

  goHistoryDetail() {
    const taskId = this.data.draft.fromHistoryTaskId;
    if (!taskId) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.navigateTo({ url: `/pages/history-detail/history-detail?taskId=${encodeURIComponent(taskId)}` });
  },

  async ensureSourceImagePath(draft) {
    if (draft.sourceImagePath) return draft.sourceImagePath;
    if (!draft.sourceImageUrl) return '';
    return new Promise((resolve, reject) => {
      wx.downloadFile({
        url: draft.sourceImageUrl,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300 && res.tempFilePath) {
            resolve(res.tempFilePath);
            return;
          }
          reject(new Error('下载历史原图失败'));
        },
        fail: () => reject(new Error('下载历史原图失败'))
      });
    });
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
      progressStageCode: '',
      progressStageName: '',
      progressStageDescription: '',
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
    const stageName = task.stageName || task.stage_name || task.stageText || task.stage_text || '';
    const stageDescription = task.stageDescription || task.stage_description || '';
    if (!stageCode && !stageName && !stageDescription) return;

    const targetProgress = resolveProgressByStage(stageCode, this.data.progressValue);
    const safeProgress = Math.max(this.data.progressValue, targetProgress);

    this.setData({
      progressStatus: 'processing',
      progressStageCode: stageCode,
      progressStageName: stageName || this.data.progressStageName,
      progressStageDescription: stageDescription || this.data.progressStageDescription,
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
    const { generating, selectedColor } = this.data;
    if (generating) return;

    const freshDraft = getFlowDraft();
    let sourceImagePath = freshDraft.sourceImagePath || '';

    if (!sourceImagePath && freshDraft.sourceImageUrl) {
      try {
        sourceImagePath = await this.ensureSourceImagePath(freshDraft);
        setFlowDraft({ sourceImagePath });
      } catch (error) {
        wx.showToast({ title: error.message || '获取历史原图失败', icon: 'none' });
        return;
      }
    }

    if (!sourceImagePath) {
      wx.showToast({ title: '请先上传原图', icon: 'none' });
      return;
    }
    if (!freshDraft.selectedScene) {
      wx.showToast({ title: '请先选择尺寸', icon: 'none' });
      return;
    }

    const requestPayload = normalizeEditDraftToPhotoRequest({
      ...freshDraft,
      backgroundColor: selectedColor || freshDraft.backgroundColor
    });
    if (!requestPayload.backgroundColor) {
      wx.showToast({ title: '背景色参数不合法，请重新选择', icon: 'none' });
      return;
    }

    const canonicalSizeCode = requestPayload.sizeCode || normalizeSizeCodeForApi(freshDraft);
    if (!canonicalSizeCode) {
      wx.showToast({ title: '当前尺寸暂不支持，请更换尺寸', icon: 'none' });
      return;
    }

    this.setData({ generating: true });
    const draft = {
      ...freshDraft,
      sourceImagePath,
      backgroundColor: requestPayload.backgroundColor,
      selectedSizeCode: canonicalSizeCode
    };

    setFlowDraft({
      backgroundColor: requestPayload.backgroundColor,
      backgroundColorLabel: getBackgroundColorLabel(requestPayload.backgroundColor),
      remakeBackgroundColorLabel: getBackgroundColorLabel(requestPayload.backgroundColor),
      selectedSizeCode: canonicalSizeCode,
      flowType: 'idPhoto',
      sourceImagePath
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
        backgroundColor: requestPayload.backgroundColor,
        fromHistoryTaskId: draft.fromHistoryTaskId || ''
      };

      const task = await createPhotoTask(sourceImagePath, processFormData);

      const poller = createTaskPoller({
        fetchTask: (taskId) => getPhotoTaskStatus(taskId),
        timeout: POLL_TIMEOUT_MS,
        onUpdate: (taskSnapshot) => {
          this.updateProgressState(taskSnapshot);
        },
        onTimeout: () => {
          this.setData({
            progressStatus: 'error',
            progressErrorMessage: '生成超时，请稍后重试',
            progressValue: Math.min(99, this.data.progressValue)
          });
        },
        onError: (error) => {
          this.setData({
            progressStatus: 'error',
            progressErrorMessage: (error && error.message) || '生成失败，请稍后重试',
            progressValue: Math.min(99, this.data.progressValue)
          });
        }
      });

      this.taskPoller = poller;
      const finalSnapshot = await poller.start(task.taskId, task);
      this.clearProgressRuntime();

      if (finalSnapshot && finalSnapshot.status === 'success') {
        this.setData({
          progressStatus: 'success',
          progressValue: 100,
          progressStageCode: normalizeStageCode(finalSnapshot.stageCode || finalSnapshot.stage),
          progressStageName: finalSnapshot.stageName || finalSnapshot.stage_name || '生成完成',
          progressStageDescription: finalSnapshot.stageDescription || finalSnapshot.stage_description || ''
        });

        await new Promise((resolve) => setTimeout(resolve, SUCCESS_STAY_MS));
        await this.finalizeSuccess(finalSnapshot, draft, requestPayload.backgroundColor, canonicalSizeCode);
        this.setData({ generating: false });
        return;
      }

      if (finalSnapshot && finalSnapshot.status === 'failed') {
        const failurePayload = buildFailurePayload(finalSnapshot, {
          taskId: finalSnapshot.taskId || task.taskId,
          message: finalSnapshot.message || finalSnapshot.qualityMessage || '生成失败，请稍后重试'
        });
        storage.set(STORAGE_KEYS.CURRENT_PROCESS_FAILURE, failurePayload);
        this.setData({
          generating: false,
          progressVisible: false,
          progressStatus: 'error',
          progressErrorMessage: failurePayload.message || '生成失败，请稍后重试',
          progressValue: Math.min(99, this.data.progressValue)
        });
        wx.navigateTo({ url: '/pages/process-failure/process-failure' });
        return;
      }

      if (finalSnapshot && finalSnapshot.status === 'timeout') {
        this.setData({
          generating: false,
          progressStatus: 'error',
          progressErrorMessage: '生成超时，请稍后重试',
          progressValue: Math.min(99, this.data.progressValue)
        });
        wx.showToast({ title: '生成超时，请稍后重试', icon: 'none' });
        return;
      }

      this.setData({
        generating: false,
        progressStatus: 'error',
        progressErrorMessage: '生成未完成，请重试',
        progressValue: Math.min(99, this.data.progressValue)
      });
    } catch (error) {
      this.clearProgressRuntime();
      this.setData({
        generating: false,
        progressStatus: 'error',
        progressErrorMessage: (error && error.message) || '发起处理失败，请稍后重试',
        progressValue: Math.min(99, this.data.progressValue)
      });
    }
  }
});
