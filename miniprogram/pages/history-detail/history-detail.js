const { STORAGE_KEYS, MOCK_HISTORY } = require('../../utils/constants');
const storage = require('../../utils/storage');

Page({
  data: {
    record: null
  },

  onLoad(options) {
    const list = storage.get(STORAGE_KEYS.HISTORY_LIST, MOCK_HISTORY);
    const record = list.find((item) => item.recordId === options.recordId) || null;
    this.setData({ record });
  },

  downloadAgain() {
    wx.showToast({ title: '下载功能待接入', icon: 'none' });
  },

  remake() {
    wx.redirectTo({ url: '/pages/upload/upload' });
  }
});
