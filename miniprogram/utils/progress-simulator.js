const { PROGRESS_STAGES, getStageIndexByProgress } = require('./progress-stages');

function clampProgress(value, min = 0, max = 100) {
  const num = Number(value);
  if (Number.isNaN(num)) return min;
  return Math.max(min, Math.min(num, max));
}

function createProgressSimulator(options = {}) {
  const tickInterval = Number(options.tickInterval) || 240;
  const firstFastTicks = Number(options.firstFastTicks) || 12;

  let timer = null;
  let tickCount = 0;

  function getMaxAllowedByStage(stageIndex = 0) {
    const safeStage = Math.min(Math.max(stageIndex, 0), PROGRESS_STAGES.length - 1);
    return PROGRESS_STAGES[safeStage].end;
  }

  function nextStepValue(current = 0) {
    if (current < 8) return 2.1;
    if (current < 25) return tickCount < firstFastTicks ? 1.7 : 1.2;
    if (current < 55) return 0.85;
    if (current < 80) return 0.5;
    return 0.25;
  }

  function start(getter, onUpdate) {
    stop();
    timer = setInterval(() => {
      tickCount += 1;
      const snapshot = typeof getter === 'function' ? getter() : {};
      const progress = clampProgress(snapshot.progress, 0, 100);
      const activeStage = Number(snapshot.activeStageIndex) || getStageIndexByProgress(progress);
      const maxAllowed = getMaxAllowedByStage(activeStage);
      const nextProgress = clampProgress(progress + nextStepValue(progress), 0, maxAllowed);
      if (typeof onUpdate === 'function' && nextProgress > progress) {
        onUpdate(Number(nextProgress.toFixed(1)));
      }
    }, tickInterval);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    tickCount = 0;
  }

  return {
    start,
    stop
  };
}

module.exports = {
  clampProgress,
  createProgressSimulator
};
