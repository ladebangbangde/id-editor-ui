const { STORAGE_KEYS } = require('../../utils/constants');
const storage = require('../../utils/storage');

function normalizeList(list, fallback = []) {
  if (Array.isArray(list) && list.length) {
    return list.filter(Boolean);
  }
  return fallback;
}

Page({
  data: {
    failure: {
      message: '照片检测未通过，请调整后重试',
      code: '',
      taskId: '',
      reasons: [],
      suggestions: [],
      createdAt: ''
    }
  },

  onShow() {
    const failure = storage.get(STORAGE_KEYS.CURRENT_PROCESS_FAILURE, {}) || {};
    this.setData({
      failure: {
        message: failure.message || '照片检测未通过，请调整后重试',
        code: failure.code || '',
        taskId: failure.taskId || '',
        reasons: normalizeList(failure.reasons, ['暂未获取到具体原因，请重新上传更清晰的正面照片再试。']),
        suggestions: normalizeList(failure.suggestions, ['请检查光线、姿态、遮挡和尺寸后重新生成。']),
        createdAt: failure.createdAt || ''
      }
    });
  },

  retry() {
    wx.navigateBack({ delta: 1 });
  },

  backToUpload() {
    wx.reLaunch({ url: '/pages/upload/upload' });
  }
});
