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

function buildRiskSummary(result = {}) {
  const warnings = Array.isArray(result.warnings) ? result.warnings : [];
  if (result.qualityStatus === 'WARNING' || warnings.length) {
    return {
      riskLevel: 'warning',
      riskTitle: '请重点关注以下风险提示',
      riskMessage: result.qualityMessage || '照片已生成，但存在需要确认的质量风险。',
      riskCountText: warnings.length ? `共 ${warnings.length} 条待确认提示` : '请重点核对生成效果'
    };
  }

  return {
    riskLevel: 'passed',
    riskTitle: '本次检测结果正常',
    riskMessage: result.qualityMessage || '质量检测通过，可继续保存或下载。',
    riskCountText: '未发现额外风险提示'
  };
}

Page({
  data: {
    result: null
  },

  onShow() {
    const result = storage.get(STORAGE_KEYS.CURRENT_RESULT, null) || MOCK_RESULT;
    const warnings = Array.isArray(result && result.warnings) ? result.warnings : [];
    this.setData({
      result: {
        warnings,
        ...result,
        warnings,
        qualityText: buildQualityText(result || {}),
        ...buildRiskSummary({
          ...result,
          warnings
        })
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
