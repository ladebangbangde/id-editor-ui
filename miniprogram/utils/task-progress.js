const STAGE_PROGRESS_MAP = {
  received: 5,
  checking: 20,
  adjusting: 45,
  generating: 75,
  finalizing: 92,
  success: 100
};

const DEFAULT_INTERVAL = 1200;
const DEFAULT_TIMEOUT = 120000;

function normalizeStageCode(value = '') {
  return String(value || '').trim().toLowerCase();
}

function resolveProgressByStage(stageCode = '', fallback = 5) {
  const normalized = normalizeStageCode(stageCode);
  if (Object.prototype.hasOwnProperty.call(STAGE_PROGRESS_MAP, normalized)) {
    return STAGE_PROGRESS_MAP[normalized];
  }
  return Number.isFinite(Number(fallback)) ? Number(fallback) : 5;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readStageSequence(task = {}) {
  const list = task.stageCodes || task.stage_codes || task.stageHistory || task.stage_history || task.stages || [];
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => {
      if (!entry) return '';
      if (typeof entry === 'string') return normalizeStageCode(entry);
      if (typeof entry === 'object') {
        return normalizeStageCode(entry.stageCode || entry.stage_code || entry.code || entry.stage);
      }
      return '';
    })
    .filter(Boolean);
}

function createTaskPoller(options = {}) {
  const {
    fetchTask,
    interval = DEFAULT_INTERVAL,
    timeout = DEFAULT_TIMEOUT,
    onUpdate,
    onTimeout,
    onError
  } = options;

  if (typeof fetchTask !== 'function') {
    throw new Error('fetchTask is required');
  }

  let stopped = false;
  const emittedStageSet = {};

  async function start(taskId, initialTask = {}) {
    if (!taskId) {
      throw new Error('taskId is required');
    }

    const startedAt = Date.now();
    let latestTask = initialTask || {};

    while (!stopped) {
      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs >= timeout) {
        const timeoutPayload = {
          taskId,
          status: 'timeout',
          stageCode: normalizeStageCode(latestTask.stageCode) || normalizeStageCode(latestTask.stage) || '',
          progress: resolveProgressByStage(latestTask.stageCode || latestTask.stage, latestTask.progress),
          elapsedMs,
          elapsedSeconds: Math.floor(elapsedMs / 1000)
        };
        if (typeof onTimeout === 'function') {
          onTimeout(timeoutPayload);
        }
        return timeoutPayload;
      }

      try {
        // eslint-disable-next-line no-await-in-loop
        latestTask = await fetchTask(taskId);
      } catch (error) {
        if (typeof onError === 'function') {
          onError(error);
        }
        throw error;
      }

      const stageCode = normalizeStageCode(latestTask.stageCode || latestTask.stage || latestTask.currentStage);
      const status = normalizeStageCode(latestTask.status || latestTask.taskStatus || '');
      const sequence = readStageSequence(latestTask);

      sequence.forEach((code) => {
        if (emittedStageSet[code]) return;
        emittedStageSet[code] = true;
        if (typeof onUpdate === 'function') {
          onUpdate({
            ...latestTask,
            taskId: latestTask.taskId || taskId,
            stageCode: code,
            progress: resolveProgressByStage(code, latestTask.progress),
            elapsedMs,
            elapsedSeconds: Math.floor(elapsedMs / 1000),
            fromStageSequence: true
          });
        }
      });

      if (stageCode) {
        emittedStageSet[stageCode] = true;
      }

      const payload = {
        ...latestTask,
        taskId: latestTask.taskId || taskId,
        stageCode: stageCode || '',
        progress: resolveProgressByStage(stageCode, latestTask.progress),
        elapsedMs,
        elapsedSeconds: Math.floor(elapsedMs / 1000)
      };

      if (typeof onUpdate === 'function') {
        onUpdate(payload);
      }

      if (payload.stageCode === 'success' || status === 'success' || status === 'succeeded' || status === 'done') {
        return {
          ...payload,
          status: 'success'
        };
      }

      if (status === 'failed' || status === 'error' || payload.stageCode === 'failed') {
        return {
          ...payload,
          status: 'failed'
        };
      }

      // eslint-disable-next-line no-await-in-loop
      await wait(interval);
    }

    return {
      taskId,
      status: 'cancelled',
      stageCode: normalizeStageCode(latestTask.stageCode) || '',
      progress: resolveProgressByStage(latestTask.stageCode, latestTask.progress),
      elapsedMs: Date.now() - startedAt,
      elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000)
    };
  }

  function stop() {
    stopped = true;
  }

  return {
    start,
    stop
  };
}

module.exports = {
  STAGE_PROGRESS_MAP,
  normalizeStageCode,
  resolveProgressByStage,
  createTaskPoller
};
