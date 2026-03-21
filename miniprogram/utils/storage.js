function set(key, value) {
  wx.setStorageSync(key, value);
}

function get(key, defaultValue = null) {
  const value = wx.getStorageSync(key);
  return value === '' || value === undefined ? defaultValue : value;
}

function remove(key) {
  wx.removeStorageSync(key);
}

function setLastResult(value) {
  set('current_result', value);
}

function getLastResult(defaultValue = null) {
  return get('current_result', defaultValue);
}

module.exports = {
  set,
  get,
  remove,
  setLastResult,
  getLastResult
};
