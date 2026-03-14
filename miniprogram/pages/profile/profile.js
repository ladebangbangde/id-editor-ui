const { getMyImages } = require('../../utils/api');
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
    const app = getApp();
    const userId = app.globalData.demoUserId;
    this.setData({ loading: true, errorText: '' });

    try {
      const res = await getMyImages(userId);
      const list = (res.data || []).map((item) => ({
        ...item,
        status: item.status || 'pending'
      }));

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
  }
});
