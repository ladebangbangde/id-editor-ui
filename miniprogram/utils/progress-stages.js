const PROGRESS_PAGE_STATE = {
  INITIAL: 'initial',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
  TIMEOUT: 'timeout'
};

const PROGRESS_STAGES = [
  {
    code: 'received',
    title: '已接收照片',
    desc: '照片上传成功，正在开始处理',
    start: 0,
    end: 10
  },
  {
    code: 'checking',
    title: '正在检查照片',
    desc: '我们会先确认人像、尺寸和照片是否适合制作证件照',
    start: 10,
    end: 30
  },
  {
    code: 'adjusting',
    title: '正在整理背景与尺寸',
    desc: '正在按你选择的规格整理照片效果',
    start: 30,
    end: 60
  },
  {
    code: 'optimizing',
    title: '正在优化照片效果',
    desc: '正在让照片看起来更自然、更清晰',
    start: 60,
    end: 85
  },
  {
    code: 'finalizing',
    title: '正在生成最终结果',
    desc: '即将完成，请再稍候一下',
    start: 85,
    end: 95
  }
];

const STAGE_ALIAS = {
  RECEIVED: 'received',
  PENDING: 'received',
  QUEUED: 'received',
  CHECKING: 'checking',
  CHECKED: 'checking',
  REVIEWING: 'checking',
  ADJUSTING: 'adjusting',
  PREPARING: 'adjusting',
  RESIZING: 'adjusting',
  OPTIMIZING: 'optimizing',
  ENHANCING: 'optimizing',
  FINALIZING: 'finalizing',
  GENERATING: 'finalizing',
  SUCCESS: 'finalizing',
  SUCCEEDED: 'finalizing',
  DONE: 'finalizing'
};

const POLL_STATUS = {
  SUCCESS: ['SUCCESS', 'SUCCEEDED', 'DONE', 'COMPLETED', 'FINISHED'],
  FAILED: ['FAILED', 'FAIL', 'ERROR', 'REJECTED', 'INVALID', 'CANCELED', 'CANCELLED'],
  PROCESSING: ['PROCESSING', 'PENDING', 'RUNNING', 'QUEUED', 'WAITING', 'STARTED']
};

function getStageByIndex(index = 0) {
  const safeIndex = Math.min(Math.max(index, 0), PROGRESS_STAGES.length - 1);
  return PROGRESS_STAGES[safeIndex];
}

function findStageIndexByCode(stageCode = '') {
  const normalized = String(stageCode || '').trim().toUpperCase();
  const internalCode = STAGE_ALIAS[normalized] || String(stageCode || '').trim().toLowerCase();
  const index = PROGRESS_STAGES.findIndex((item) => item.code === internalCode);
  return index >= 0 ? index : -1;
}

function getStageIndexByProgress(progress = 0) {
  const safeProgress = Math.max(0, Math.min(Number(progress) || 0, 100));
  for (let index = PROGRESS_STAGES.length - 1; index >= 0; index -= 1) {
    if (safeProgress >= PROGRESS_STAGES[index].start) {
      return index;
    }
  }
  return 0;
}

function deriveTaskStatus(task = {}) {
  const status = String(task.status || task.taskStatus || task.qualityStatus || '').trim().toUpperCase();
  if (POLL_STATUS.SUCCESS.includes(status)) return 'success';
  if (POLL_STATUS.FAILED.some((item) => status.includes(item))) return 'failed';
  return 'processing';
}

function getFriendlyFailureMessage(task = {}, fallback = '') {
  return task.message
    || task.qualityMessage
    || (task.error && task.error.message)
    || fallback
    || '这次处理没有成功，请换一张更清晰、正面的照片再试一次';
}

module.exports = {
  PROGRESS_PAGE_STATE,
  PROGRESS_STAGES,
  POLL_STATUS,
  getStageByIndex,
  findStageIndexByCode,
  getStageIndexByProgress,
  deriveTaskStatus,
  getFriendlyFailureMessage
};
