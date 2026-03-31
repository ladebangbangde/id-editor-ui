const cacheStore = new Map();

function setCache(key, value, ttlMs = 30000) {
  if (!key) return;
  cacheStore.set(key, {
    value,
    expireAt: Date.now() + Math.max(0, Number(ttlMs) || 0)
  });
}

function getCache(key) {
  if (!key || !cacheStore.has(key)) return null;
  const cacheItem = cacheStore.get(key);
  if (!cacheItem) return null;
  if (cacheItem.expireAt && cacheItem.expireAt < Date.now()) {
    cacheStore.delete(key);
    return null;
  }
  return cacheItem.value;
}

function clearCache(key) {
  if (!key) return;
  cacheStore.delete(key);
}

module.exports = {
  setCache,
  getCache,
  clearCache
};
