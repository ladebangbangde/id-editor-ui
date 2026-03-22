const { getPhotoTask } = require('../../utils/api');
const { formatTime, getColorLabel } = require('../../utils/format');
const { saveImageFromUrl } = require('../../utils/save-image');
const {
  getFriendlySceneName,
  getFriendlySceneHint,
  getFriendlySizeText,
  getQualityStatusLabel
} = require('../../utils/photo-display');

function normalizeDetail(detail = {}) {
  const warnings = Array.isArray(detail.warnings) ? detail.warnings : [];
  return {
    taskId: detail.taskId || detail.id,
    imageId: detail.imageId || '',
    sceneName: getFriendlySceneName(detail, '证件照'),
    sceneHint: getFriendlySceneHint(detail),
    sizeText: getFriendlySizeText(detail),
    sizeCode: detail.sizeCode || '',
    backgroundColor: detail.backgroundColorLabel
      || (detail.backgroundColor ? getColorLabel(detail.backgroundColor) : '')
      || detail.backgroundColor
      || '--',
    previewUrl: detail.previewUrl || detail.resultUrl || detail.originalUrl || '',
    resultUrl: detail.resultUrl || detail.previewUrl || '',
    hdUrl: detail.hdUrl || detail.resultUrl || detail.previewUrl || '',
    printLayoutUrl: detail.printLayoutUrl || detail.layoutUrl || '',
    qualityStatus: getQualityStatusLabel(detail.qualityStatus),
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

  async savePreview() {
    const { record } = this.data;
    await saveImageFromUrl(record && record.previewUrl, {
      loadingText: '正在保存预览图',
      successText: '预览图已保存到相册'
    });
  },

  async saveHd() {
    const { record } = this.data;
    await saveImageFromUrl(record && (record.hdUrl || record.resultUrl || record.previewUrl), {
      loadingText: '正在保存高清图',
      successText: '高清图已保存到相册'
    });
  },

  async saveLayout() {
    const { record } = this.data;
    await saveImageFromUrl(record && record.printLayoutUrl, {
      emptyText: '这条历史记录里还没有排版图',
      loadingText: '正在保存排版图',
      successText: '排版图已保存到相册'
    });
  },

  remake() {
    wx.redirectTo({ url: '/pages/upload/upload' });
  }
});
