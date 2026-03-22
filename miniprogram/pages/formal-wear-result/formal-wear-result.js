const { STORAGE_KEYS } = require('../../utils/constants');
const storage = require('../../utils/storage');
const { saveImageFromUrl } = require('../../utils/save-image');

function normalizeResult(result = {}) {
  return {
    ...result,
    previewUrl: result.previewUrl || result.resultUrl || '',
    resultUrl: result.resultUrl || result.previewUrl || '',
    originalUrl: result.originalUrl || '',
    styleLabel: result.styleLabel || '标准正装',
    colorLabel: result.colorLabel || '黑色',
    genderLabel: result.genderLabel || '男士',
    tips: Array.isArray(result.tips) ? result.tips : [],
    isMock: Boolean(result.isMock)
  };
}

Page({
  data: {
    result: null,
    compareMode: 'after'
  },

  onShow() {
    const result = normalizeResult(storage.get(STORAGE_KEYS.FORMAL_WEAR_RESULT, {}));
    if (!result.previewUrl && !result.resultUrl) {
      wx.showToast({ title: '还没有换装结果', icon: 'none' });
      wx.navigateBack({ delta: 1 });
      return;
    }

    this.setData({
      result,
      compareMode: result.originalUrl ? 'after' : 'after'
    });
  },

  switchCompareMode(event) {
    const { mode } = event.currentTarget.dataset;
    if (!mode) return;
    this.setData({ compareMode: mode });
  },

  saveResult() {
    const { result } = this.data;
    saveImageFromUrl(result && (result.resultUrl || result.previewUrl), {
      loadingText: '正在保存换装结果',
      successText: '换装结果已保存到相册',
      emptyText: '还没有可保存的换装结果'
    });
  },

  remake() {
    wx.redirectTo({ url: '/pages/formal-wear/formal-wear' });
  },

  goHome() {
    wx.switchTab({ url: '/pages/home/home' });
  }
});
