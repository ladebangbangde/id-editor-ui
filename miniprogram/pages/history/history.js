const { getHistory } = require('../../utils/api');
const { formatTime } = require('../../utils/format');

function normalizeRecord(item = {}) {
  const result = item.result || {};
  const scene = item.scene || {};
  return {
    imageId: item.imageId || item.id,
    sceneName: item.sceneName || scene.sceneName || scene.name || '证件照',
    sizeText: item.sizeText || item.size || `${item.widthMm || '--'}×${item.heightMm || '--'}mm`,
    backgroundColor: item.backgroundColorLabel || item.backgroundColor || '--',
    previewUrl: item.previewUrl || result.previewUrl || item.originalUrl || '',
    createdAt: formatTime(item.createdAt),
    status: item.status || 'pending'
  };
}

Page({
  data: {
    list: []
  },

  onShow() {
    this.fetchHistory();
  },

  async fetchHistory() {
    try {
      const data = await getHistory(1, 20);
      const list = (data.list || []).map(normalizeRecord);
      this.setData({ list });
    } catch (error) {
      this.setData({ list: [] });
      wx.showToast({ title: '历史记录加载失败', icon: 'none' });
    }
  },

  goDetail(event) {
    const record = event.detail.record;
    const imageId = record && record.imageId;
    if (!imageId) return;
    wx.navigateTo({ url: `/pages/history-detail/history-detail?imageId=${imageId}` });
  },

  goCreate() {
    wx.switchTab({ url: '/pages/home/home' });
  }
});
