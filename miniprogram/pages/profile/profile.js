const { getImageHistory, mapHistoryItem, adminLogin, getAdminStats } = require('../../utils/api');
const storage = require('../../utils/storage');

Page({
  data: {
    profile: {
      nickname: 'Demo User',
      avatarUrl: ''
    },
    list: [],
    loading: false,
    empty: false,
    errorText: ''
  },

  onLoad() {
    this.setData({ profile: storage.getUserProfile() });
  },

  onShow() {
    this.fetchRecords();
  },

  onPullDownRefresh() {
    this.fetchRecords(true);
  },

  async fetchRecords(fromPullDown = false) {
    this.setData({ loading: true, errorText: '' });

    try {
      const res = await getImageHistory(1, 20);
      const list = (res.data && res.data.list ? res.data.list : []).map(mapHistoryItem);

      this.setData({
        list,
        empty: list.length === 0
      });

      storage.setLastRecords(list);
    } catch (error) {
      this.setData({
        errorText: error.message || 'Failed to load records',
        empty: false
      });
      const fallback = storage.getLastRecords();
      if (fallback.length) {
        this.setData({ list: fallback });
      }
    } finally {
      this.setData({ loading: false });
      if (fromPullDown) {
        wx.stopPullDownRefresh();
      }
    }
  },

  goDetail(event) {
    const record = event.detail.record;
    if (!record || !record.imageId) return;
    storage.set('current_record', record);
    wx.navigateTo({
      url: `/pages/history-detail/history-detail?imageId=${record.imageId}`
    });
  },

  async handleAdminStats() {
    try {
      const loginRes = await adminLogin();
      const token = loginRes.data && loginRes.data.token;
      const statsRes = await getAdminStats(token || 'demo-token');
      wx.showModal({
        title: 'Admin Stats',
        content: JSON.stringify(statsRes.data || {}, null, 2),
        showCancel: false
      });
    } catch (error) {
      wx.showToast({ title: error.message || 'Load admin stats failed', icon: 'none' });
    }
  }
});
