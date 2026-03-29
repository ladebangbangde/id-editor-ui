const { getPhotoTask } = require('../utils/api');

const DEFAULT_TIMEOUT_MS = 90 * 1000;
const DEFAULT_INTERVAL_MS = 1800;
const DEFAULT_RETRY = 2;

function createTaskPoller(taskId, options = {}) {
  const intervalMs = Number(options.intervalMs) || DEFAULT_INTERVAL_MS;
  const timeoutMs = Number(options.timeoutMs) || DEFAULT_TIMEOUT_MS;
  const maxRetry = Number(options.maxRetry) >= 0 ? Number(options.maxRetry) : DEFAULT_RETRY;

  let timer = null;
  let active = false;
  let startedAt = 0;
  let retryCount = 0;

  async function runOnce(handlers = {}) {
    if (!active) return;
    if (!taskId) {
      active = false;
      handlers.onError && handlers.onError(new Error('任务不存在'));
      return;
    }

    if (Date.now() - startedAt > timeoutMs) {
      active = false;
      handlers.onTimeout && handlers.onTimeout();
      return;
    }

    try {
      const task = await getPhotoTask(taskId);
      retryCount = 0;
      handlers.onData && handlers.onData(task || {});
    } catch (error) {
      retryCount += 1;
      if (retryCount <= maxRetry) {
        handlers.onRetry && handlers.onRetry({ retryCount, maxRetry, error });
      } else {
        active = false;
        handlers.onError && handlers.onError(error);
        return;
      }
    }

    if (active) {
      timer = setTimeout(() => runOnce(handlers), intervalMs);
    }
  }

  function start(handlers = {}) {
    if (active) return;
    active = true;
    startedAt = Date.now();
    retryCount = 0;
    runOnce(handlers);
  }

  function stop() {
    active = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return {
    start,
    stop,
    isActive() {
      return active;
    }
  };
}

module.exports = {
  createTaskPoller,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_INTERVAL_MS
};
