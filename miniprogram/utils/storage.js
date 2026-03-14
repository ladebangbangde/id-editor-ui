const { STORAGE_KEYS } = require('./constants');

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

function setLastResult(result) {
  set(STORAGE_KEYS.LAST_RESULT, result);
}

function getLastResult() {
  return get(STORAGE_KEYS.LAST_RESULT, null);
}

function setUserProfile(profile) {
  set(STORAGE_KEYS.USER_PROFILE, profile);
}

function getUserProfile() {
  return get(STORAGE_KEYS.USER_PROFILE, {
    nickname: 'Demo User',
    avatarUrl: ''
  });
}

function setLastRecords(records) {
  set(STORAGE_KEYS.LAST_RECORDS, records || []);
}

function getLastRecords() {
  return get(STORAGE_KEYS.LAST_RECORDS, []);
}

module.exports = {
  set,
  get,
  remove,
  setLastResult,
  getLastResult,
  setUserProfile,
  getUserProfile,
  setLastRecords,
  getLastRecords,
  STORAGE_KEYS
};
