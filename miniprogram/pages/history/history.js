const { STORAGE_KEYS, MOCK_HISTORY } = require('../../utils/constants');
const storage = require('../../utils/storage');

Page({
  data: {
    list: []
  },

  onShow() {
    const list = storage.get(STORAGE_KEYS.HISTORY_LIST, MOCK_HISTORY);
    this.setData({ list });
  },

  goDetail(event) {
    const record = event.detail.record;
    if (!record || !record.recordId) return;
    wx.navigateTo({ url: `/pages/history-detail/history-detail?recordId=${record.recordId}` });
  },

  goCreate() {
    wx.switchTab({ url: '/pages/home/home' });
  }
});
