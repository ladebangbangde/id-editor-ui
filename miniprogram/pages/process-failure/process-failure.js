const { STORAGE_KEYS } = require('../../utils/constants');
const storage = require('../../utils/storage');

function normalizeList(list, fallback = []) {
  if (Array.isArray(list) && list.length) {
    return list.filter(Boolean);
  }
  return fallback;
}

function normalizeReasons(reasons = []) {
  return normalizeList(reasons).map((item) => {
    if (typeof item === 'string') {
      return {
        title: item,
        detail: '',
        reasonCode: '',
        displayText: item
      };
    }

    if (item && typeof item === 'object') {
      const title = item.title || item.name || item.message || '未通过原因';
      const detail = item.detail || item.description || '';
      return {
        title,
        detail,
        reasonCode: item.code || '',
        displayText: detail ? `${title}：${detail}` : title
      };
    }

    return {
      title: String(item || ''),
      detail: '',
      reasonCode: '',
      displayText: String(item || '')
    };
  }).filter((item) => item.title);
}

function normalizeSuggestions(suggestions = []) {
  return normalizeList(suggestions)
    .map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return item;
      if (typeof item === 'object') return item.title || item.detail || item.message || '';
      return String(item || '');
    })
    .filter(Boolean);
}

Page({
  data: {
    failure: {
      title: '照片不符合证件照要求',
      subtitle: '请根据以下原因调整后重新上传',
      message: '照片检测未通过，请调整后重试',
      code: '',
      taskId: '',
      reasons: [],
      warnings: [],
      suggestions: [],
      createdAt: ''
    }
  },

  onShow() {
    const failure = storage.get(STORAGE_KEYS.CURRENT_PROCESS_FAILURE, {}) || {};
    const normalizedReasons = normalizeReasons(failure.reasons);
    const normalizedWarnings = normalizeSuggestions(failure.warnings);
    const normalizedSuggestions = normalizeSuggestions(failure.suggestions);
    const fallbackReason = failure.message || (failure.error && failure.error.message) || '请重新上传更清晰的正面照片再试';

    this.setData({
      failure: {
        title: failure.title || '照片不符合证件照要求',
        subtitle: failure.subtitle || '请根据以下原因调整后重新上传',
        message: failure.message || '照片检测未通过，请调整后重试',
        code: failure.code || '',
        taskId: failure.taskId || '',
        detailSummary: failure.detailSummary || '',
        reasons: normalizedReasons.length ? normalizedReasons : [{
          title: fallbackReason,
          detail: '',
          reasonCode: '',
          displayText: fallbackReason
        }],
        warnings: normalizedWarnings,
        suggestions: normalizedSuggestions.length
          ? normalizedSuggestions
          : ['请检查光线、姿态、遮挡和尺寸后重新生成。'],
        createdAt: failure.createdAt || ''
      }
    });
  },

  retry() {
    wx.reLaunch({ url: '/pages/upload/upload' });
  },

  backToUpload() {
    wx.reLaunch({ url: '/pages/home/home' });
  }
});
