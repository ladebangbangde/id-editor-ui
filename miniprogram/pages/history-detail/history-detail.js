const { getImageDetail, getDownloadUrl } = require('../../utils/api');
const { formatTime } = require('../../utils/format');

Page({
  data: {
    record: null
  },

  async onLoad(options) {
    if (!options.imageId) {
      this.setData({ record: null });
      return;
    }

    try {
      const detail = await getImageDetail(options.imageId);
      const result = detail.result || {};
      const scene = detail.scene || {};
      const record = {
        imageId: detail.imageId || options.imageId,
        resultId: result.resultId || result.id,
        previewUrl: result.previewUrl || detail.originalUrl || '',
        sceneName: detail.sceneName || scene.sceneName || '证件照',
        sizeText: detail.sizeText || `${detail.widthMm || '--'}×${detail.heightMm || '--'}mm`,
        backgroundColor: detail.backgroundColor || '--',
        createdAt: formatTime(detail.createdAt)
      };
      this.setData({ record });
    } catch (error) {
      this.setData({ record: null });
      wx.showToast({ title: '详情加载失败', icon: 'none' });
    }
  },

  async downloadAgain() {
    const { record } = this.data;
    if (!record || !record.resultId) return;
    try {
      const data = await getDownloadUrl(record.resultId, 'preview');
      wx.setClipboardData({ data: data.url || data.downloadUrl || record.previewUrl || '' });
    } catch (error) {
      wx.showToast({ title: '下载地址获取失败', icon: 'none' });
    }
  },

  remake() {
    wx.redirectTo({ url: '/pages/upload/upload' });
  }
});
