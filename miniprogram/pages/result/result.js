const { STORAGE_KEYS, MOCK_RESULT } = require('../../utils/constants');
const storage = require('../../utils/storage');

function buildQualityText(result = {}) {
  if (result.qualityStatus === 'WARNING') {
    return '质量待关注';
  }
  if (result.qualityStatus === 'PASSED') {
    return '质量通过';
  }
  return '处理中';
}

Page({
  data: {
    result: null
  },

  onShow() {
    const result = storage.get(STORAGE_KEYS.CURRENT_RESULT, null) || MOCK_RESULT;
    this.setData({
      result: {
        warnings: [],
        ...result,
        warnings: Array.isArray(result && result.warnings) ? result.warnings : [],
        qualityText: buildQualityText(result || {})
      }
    });
  },

  copyAssetUrl(field, successText) {
    const { result } = this.data;
    const url = result && result[field];
    if (!url) {
      wx.showToast({ title: '无可用结果', icon: 'none' });
      return;
    }

    wx.setClipboardData({
      data: url,
      success: () => wx.showToast({ title: successText, icon: 'none' })
    });
  },

  savePreview() {
    this.copyAssetUrl('previewUrl', '预览图链接已复制');
  },

  downloadHd() {
    this.copyAssetUrl('resultUrl', '高清图链接已复制');
  },

  downloadLayout() {
    this.copyAssetUrl('resultUrl', '结果链接已复制');
  },

  remake() {
    wx.redirectTo({ url: '/pages/upload/upload' });
  }
});
