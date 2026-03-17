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

module.exports = {
  set,
  get,
  remove
};
