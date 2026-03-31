function withSubmitLock(ctx, lockKey, fn) {
  if (!ctx || !lockKey || typeof fn !== 'function') {
    return Promise.reject(new Error('invalid lock call'));
  }
  const data = ctx.data || {};
  if (data[lockKey]) {
    return Promise.resolve(null);
  }
  ctx.setData({ [lockKey]: true });
  return Promise.resolve()
    .then(() => fn())
    .finally(() => {
      ctx.setData({ [lockKey]: false });
    });
}

module.exports = {
  withSubmitLock
};
