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
      title: '当前照片不适合作为证件照原图',
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
    const normalizedReasons = normalizeReasons(failure.reasons);
    const normalizedSuggestions = normalizeSuggestions(failure.suggestions);

    this.setData({
      failure: {
        title: failure.title || '当前照片不适合作为证件照原图',
        message: failure.message || '照片检测未通过，请调整后重试',
        code: failure.code || '',
        taskId: failure.taskId || '',
        detailSummary: failure.detailSummary || '',
        reasons: normalizedReasons.length ? normalizedReasons : [{
          title: '暂未获取到具体原因',
          detail: '请重新上传更清晰的正面照片再试',
          reasonCode: '',
          displayText: '暂未获取到具体原因，请重新上传更清晰的正面照片再试。'
        }],
        suggestions: normalizedSuggestions.length
          ? normalizedSuggestions
          : ['请检查光线、姿态、遮挡和尺寸后重新生成。'],
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
