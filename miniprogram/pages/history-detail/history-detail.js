const { getImageDetail, downloadPreview } = require('../../utils/api');
const { formatTime, getColorLabel } = require('../../utils/format');

function normalizeDetail(detail = {}) {
  const scene = detail.scene || {};
  const result = detail.result || {};
  return {
    imageId: detail.imageId || detail.id,
    resultId: result.resultId || result.id || detail.resultId,
    sceneName: scene.sceneName || detail.sceneName || '证件照',
    sizeText:
      detail.sizeText ||
      `${scene.widthMm || detail.widthMm || '--'}×${scene.heightMm || detail.heightMm || '--'}mm`,
    backgroundColor: getColorLabel(result.backgroundColor || detail.backgroundColor),
    previewUrl: result.previewUrl || detail.previewUrl || detail.originalUrl || '',
    createdAt: formatTime(detail.createdAt)
  };
}

Page({
  data: {
    record: null
  },

  onLoad(options) {
    if (!options.imageId) return;
    this.fetchDetail(options.imageId);
  },

  async fetchDetail(imageId) {
    try {
      const detail = await getImageDetail(imageId);
      this.setData({ record: normalizeDetail(detail) });
    } catch (error) {
      wx.showToast({ title: '历史详情加载失败', icon: 'none' });
      this.setData({ record: null });
    }
  },

  async downloadAgain() {
    const { record } = this.data;
    if (!record || !record.resultId) {
      wx.showToast({ title: '无可下载文件', icon: 'none' });
      return;
    }

    try {
      const data = await downloadPreview(record.resultId);
      wx.setClipboardData({
        data: data.downloadUrl || data.url || '',
        success: () => wx.showToast({ title: '下载链接已复制', icon: 'none' })
      });
    } catch (error) {
      wx.showToast({ title: '下载失败', icon: 'none' });
    }
  },

  remake() {
    wx.redirectTo({ url: '/pages/upload/upload' });
  }
});
