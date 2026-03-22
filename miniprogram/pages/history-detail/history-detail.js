const { getPhotoTask } = require('../../utils/api');
const { formatTime, getColorLabel } = require('../../utils/format');

function normalizeDetail(detail = {}) {
  const warnings = Array.isArray(detail.warnings) ? detail.warnings : [];
  return {
    taskId: detail.taskId || detail.id,
    imageId: detail.imageId || '',
    sceneName: detail.sceneName || '证件照',
    sizeText:
      detail.sizeText ||
      detail.sizeCode ||
      `${detail.widthMm || '--'}×${detail.heightMm || '--'}mm`,
    sizeCode: detail.sizeCode || '',
    backgroundColor: detail.backgroundColorLabel
      || (detail.backgroundColor ? getColorLabel(detail.backgroundColor) : '')
      || detail.backgroundColor
      || '--',
    previewUrl: detail.previewUrl || detail.resultUrl || detail.originalUrl || '',
    resultUrl: detail.resultUrl || detail.previewUrl || '',
    qualityStatus: detail.qualityStatus || '',
    qualityMessage: detail.qualityMessage || '',
    warnings,
    createdAt: formatTime(detail.createdAt)
  };
}

Page({
  data: {
    record: null
  },

  onLoad(options) {
    const taskId = options.taskId || options.imageId;
    if (!taskId) return;
    this.fetchDetail(taskId);
  },

  async fetchDetail(taskId) {
    try {
      const detail = await getPhotoTask(taskId);
      this.setData({ record: normalizeDetail(detail) });
    } catch (error) {
      wx.showToast({ title: '历史详情加载失败', icon: 'none' });
      this.setData({ record: null });
    }
  },

  async downloadAgain() {
    const { record } = this.data;
    const downloadUrl = record && (record.resultUrl || record.previewUrl);
    if (!downloadUrl) {
      wx.showToast({ title: '无可下载文件', icon: 'none' });
      return;
    }

    try {
      wx.setClipboardData({
        data: downloadUrl,
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
