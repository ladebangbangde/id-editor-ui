const storage = require('../../utils/storage');
const { STORAGE_KEYS } = require('../../utils/constants');
const { getFlowDraft } = require('../../utils/flow-draft');
const { createTaskPoller, DEFAULT_TIMEOUT_MS } = require('../../services/task');
const {
  PROGRESS_PAGE_STATE,
  PROGRESS_STAGES,
  getStageByIndex,
  findStageIndexByCode,
  getStageIndexByProgress,
  deriveTaskStatus,
  getFriendlyFailureMessage
} = require('../../utils/progress-stages');
const { createProgressSimulator, clampProgress } = require('../../utils/progress-simulator');

const MIN_VISIBLE_MS = 1500;

function buildStageItems(activeStageIndex = 0) {
  return PROGRESS_STAGES.map((item, index) => {
    let state = 'todo';
    if (index < activeStageIndex) state = 'done';
    if (index === activeStageIndex && activeStageIndex < PROGRESS_STAGES.length) state = 'doing';
    return {
      ...item,
      state
    };
  });
}

function mapTaskToResult(task = {}, fallback = {}) {
  const draft = getFlowDraft();
  const sceneInfo = fallback.sceneInfo || draft.selectedScene || {};
  const sourceImagePath = fallback.sourceImagePath || draft.sourceImagePath || '';
  const sourceImageUrl = fallback.sourceImageUrl || draft.sourceImageUrl || sourceImagePath;

  return {
    imagePath: sourceImagePath,
    sourceImagePath,
    sourceImageUrl,
    sceneInfo,
    sceneName: fallback.sceneName || sceneInfo.sceneName || '证件照',
    sizeText: fallback.sizeText || `${sceneInfo.widthMm || ''}×${sceneInfo.heightMm || ''}mm`,
    taskId: task.taskId || fallback.taskId || '',
    status: task.status || fallback.status || 'SUCCESS',
    previewUrl: task.previewUrl || fallback.previewUrl || '',
    resultUrl: task.resultUrl || fallback.resultUrl || '',
    backgroundColor: task.backgroundColor || fallback.backgroundColor || '',
    backgroundColorLabel: fallback.backgroundColorLabel || '',
    sizeCode: task.sizeCode || fallback.sizeCode || '',
    width: task.width || fallback.width || sceneInfo.pixelWidth || 0,
    height: task.height || fallback.height || sceneInfo.pixelHeight || 0,
    warnings: Array.isArray(task.warnings) ? task.warnings : (Array.isArray(fallback.warnings) ? fallback.warnings : []),
    qualityStatus: task.qualityStatus || fallback.qualityStatus || '',
    qualityMessage: task.qualityMessage || task.message || fallback.qualityMessage || '',
    createdAt: task.createdAt || fallback.createdAt || '',
    hdUrl: task.hdUrl || task.resultUrl || fallback.hdUrl || fallback.resultUrl || '',
    candidates: Array.isArray(task.candidates) ? task.candidates : (Array.isArray(fallback.candidates) ? fallback.candidates : []),
    code: task.code || fallback.code || '',
    message: task.message || fallback.message || '',
    details: Array.isArray(task.details) ? task.details : (Array.isArray(fallback.details) ? fallback.details : []),
    riskTips: Array.isArray(task.riskTips) ? task.riskTips : (Array.isArray(fallback.riskTips) ? fallback.riskTips : [])
  };
}

Page({
  data: {
    pageState: PROGRESS_PAGE_STATE.INITIAL,
    headerTitle: '正在为你制作证件照',
    headerSubtitle: '整个过程通常很快，请稍候片刻',
    progress: 1,
    progressText: '1%',
    progressBarWidth: '1%',
    currentStage: getStageByIndex(0),
    activeStageIndex: 0,
    stageItems: buildStageItems(0),
    failureTitle: '照片暂时无法制作证件照',
    failureText: '请重新上传一张更清晰、正面的照片再试一次',
    taskId: ''
  },

  onLoad(options = {}) {
    const taskId = decodeURIComponent(options.taskId || '');
    const sceneName = decodeURIComponent(options.sceneName || '');
    const context = storage.get(STORAGE_KEYS.CURRENT_PROGRESS_CONTEXT, null) || {};

    if (!taskId) {
      this.setData({
        pageState: PROGRESS_PAGE_STATE.FAILED,
        failureTitle: '没有找到这次处理任务',
        failureText: '请返回首页后重新上传照片。'
      });
      return;
    }

    this.taskId = taskId;
    this.context = {
      ...context,
      taskId,
      sceneName: sceneName || context.sceneName || '证件照'
    };
    storage.set(STORAGE_KEYS.CURRENT_PROGRESS_CONTEXT, this.context);

    this.poller = createTaskPoller(taskId, {
      timeoutMs: DEFAULT_TIMEOUT_MS,
      intervalMs: 1800,
      maxRetry: 2
    });
    this.simulator = createProgressSimulator({ tickInterval: 240 });
    this.enterAt = Date.now();
    this.isRedirecting = false;

    this.setData({
      taskId,
      pageState: PROGRESS_PAGE_STATE.PROCESSING,
      headerTitle: '正在为你制作证件照',
      headerSubtitle: '整个过程通常很快，请稍候片刻'
    });

    this.startProcessing();
  },


  onShow() {
    if (this.data.pageState !== PROGRESS_PAGE_STATE.PROCESSING || !this.taskId || this.isRedirecting) {
      return;
    }
    if (this.poller && this.poller.isActive()) return;
    this.startProcessing();
  },

  onHide() {
    this.clearAllWorkers();
  },

  onUnload() {
    this.clearAllWorkers();
  },

  clearAllWorkers() {
    if (this.poller) this.poller.stop();
    if (this.simulator) this.simulator.stop();
    if (this.successTimer) {
      clearTimeout(this.successTimer);
      this.successTimer = null;
    }
  },

  startProcessing() {
    this.simulator.start(
      () => ({ progress: this.data.progress, activeStageIndex: this.data.activeStageIndex }),
      (nextProgress) => {
        const nextStageIndex = getStageIndexByProgress(nextProgress);
        this.applyProgress(nextProgress, nextStageIndex);
      }
    );

    this.poller.start({
      onData: (task) => this.handleTaskData(task),
      onError: (error) => {
        this.handleFailedState(getFriendlyFailureMessage(error, '照片暂时无法制作证件照，请重新上传试试'));
      },
      onTimeout: () => {
        this.setData({
          pageState: PROGRESS_PAGE_STATE.TIMEOUT,
          failureTitle: '等待时间有点长',
          failureText: '这次制作还没完成，你可以重新上传后再试一次。'
        });
        this.clearAllWorkers();
      }
    });
  },

  handleTaskData(task = {}) {
    const taskStatus = deriveTaskStatus(task);

    if (taskStatus === 'failed') {
      this.handleFailedState(getFriendlyFailureMessage(task, '这次处理没有成功，请换一张更清晰、正面的照片再试一次'));
      return;
    }

    const backendProgress = Number(task.progress);
    const hasBackendProgress = !Number.isNaN(backendProgress) && backendProgress > 0;
    const backendStageIndex = findStageIndexByCode(task.stageCode || task.stage || task.phase);

    const currentProgress = this.data.progress;
    let targetProgress = currentProgress;
    let nextStageIndex = this.data.activeStageIndex;

    if (hasBackendProgress) {
      targetProgress = Math.max(currentProgress, clampProgress(backendProgress, 0, 95));
      nextStageIndex = Math.max(nextStageIndex, getStageIndexByProgress(targetProgress));
    }

    if (backendStageIndex >= 0) {
      nextStageIndex = Math.max(nextStageIndex, backendStageIndex);
      targetProgress = Math.max(targetProgress, PROGRESS_STAGES[nextStageIndex].start);
    }

    if (task.stageText) {
      const stage = getStageByIndex(nextStageIndex);
      this.setData({
        currentStage: {
          ...stage,
          title: task.stageText,
          desc: stage.desc
        }
      });
    }

    this.applyProgress(targetProgress, nextStageIndex);

    const hasResult = Boolean(task.previewUrl || task.resultUrl || task.hdUrl);
    if (taskStatus === 'success' || hasResult) {
      this.handleSuccess(task);
    }
  },

  applyProgress(rawProgress, stageIndex) {
    const safeStageIndex = typeof stageIndex === 'number' ? stageIndex : getStageIndexByProgress(rawProgress);
    const safeProgress = clampProgress(rawProgress, 1, 95);
    const stage = getStageByIndex(safeStageIndex);
    this.setData({
      pageState: PROGRESS_PAGE_STATE.PROCESSING,
      progress: safeProgress,
      progressText: `${Math.round(safeProgress)}%`,
      progressBarWidth: `${safeProgress}%`,
      currentStage: stage,
      activeStageIndex: safeStageIndex,
      stageItems: buildStageItems(safeStageIndex)
    });
  },

  handleSuccess(task = {}) {
    if (this.isRedirecting) return;
    this.isRedirecting = true;
    this.clearAllWorkers();

    const elapsed = Date.now() - this.enterAt;
    const waitMs = Math.max(0, MIN_VISIBLE_MS - elapsed);

    const doneStageIndex = PROGRESS_STAGES.length - 1;
    this.setData({
      pageState: PROGRESS_PAGE_STATE.SUCCESS,
      progress: 100,
      progressText: '100%',
      progressBarWidth: '100%',
      currentStage: {
        ...getStageByIndex(doneStageIndex),
        title: '制作完成，正在为你打开结果'
      },
      activeStageIndex: doneStageIndex,
      stageItems: buildStageItems(PROGRESS_STAGES.length)
    });

    const resultPayload = mapTaskToResult(task, this.context || {});
    storage.set(STORAGE_KEYS.CURRENT_RESULT, resultPayload);

    this.successTimer = setTimeout(() => {
      wx.redirectTo({ url: '/pages/result/result' });
    }, waitMs);
  },

  handleFailedState(message) {
    if (this.isRedirecting) return;
    this.clearAllWorkers();
    this.setData({
      pageState: PROGRESS_PAGE_STATE.FAILED,
      failureTitle: '照片暂时无法制作证件照',
      failureText: message || '照片暂时无法制作证件照，请重新上传试试'
    });
  },

  handleReupload() {
    this.clearAllWorkers();
    wx.redirectTo({ url: '/pages/upload/upload?flow=id-photo' });
  },

  goHome() {
    this.clearAllWorkers();
    wx.switchTab({ url: '/pages/home/home' });
  },

  noop() {
    wx.showToast({ title: '正在处理中，请稍候', icon: 'none' });
  }
});
