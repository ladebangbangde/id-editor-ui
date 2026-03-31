const pendingMap = new Map();

function runWithDedupe(key, requestFactory) {
  if (!key || typeof requestFactory !== 'function') {
    return Promise.reject(new Error('invalid dedupe request'));
  }
  if (pendingMap.has(key)) {
    return pendingMap.get(key);
  }
  const task = Promise.resolve()
    .then(() => requestFactory())
    .finally(() => {
      pendingMap.delete(key);
    });
  pendingMap.set(key, task);
  return task;
}

module.exports = {
  runWithDedupe
};
