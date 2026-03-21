function buildHeader(header = {}) {
  const app = getApp();
  const authHeader = app.globalData.authToken
    ? { Authorization: `Bearer ${app.globalData.authToken}` }
    : {};
  return {
    'content-type': 'application/json',
    ...authHeader,
    ...header
  };
}

function buildUploadHeader(header = {}) {
  const nextHeader = buildHeader(header);
  delete nextHeader['content-type'];
  delete nextHeader['Content-Type'];
  return nextHeader;
}

function showError(message) {
  wx.showToast({ title: message || '请求失败', icon: 'none' });
}

function normalizeList(list) {
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

function normalizeErrorPayload(payload = {}, fallbackMessage = '请求失败') {
  const data = payload && typeof payload.data === 'object' ? payload.data : {};
  return {
    ...payload,
    message: payload.message || payload.msg || fallbackMessage,
    code: payload.code || '',
    data,
    taskId: payload.taskId || data.taskId || '',
    reasons: normalizeList(payload.reasons || data.reasons),
    suggestions: normalizeList(payload.suggestions || data.suggestions),
    isBusinessError: true
  };
}

function rejectWithError(reject, payload, fallbackMessage, shouldToast) {
  const error = normalizeErrorPayload(payload, fallbackMessage);
  if (shouldToast) {
    showError(error.message);
  }
  reject(error);
}

function parseUploadResponse(rawData) {
  if (!rawData) return {};
  if (typeof rawData === 'object') return rawData;
  try {
    return JSON.parse(rawData);
  } catch (error) {
    throw new Error('上传响应解析失败');
  }
}

function request(url, method = 'GET', data = {}, options = {}) {
  const {
    showLoading = false,
    loadingText = '加载中',
    header = {},
    showErrorToast = true
  } = options;

  if (showLoading) {
    wx.showLoading({ title: loadingText, mask: true });
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      data,
      header: buildHeader(header),
      success(res) {
        const body = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (body.success === false) {
            rejectWithError(reject, body, '请求失败', showErrorToast);
            return;
          }
          resolve(body);
          return;
        }

        rejectWithError(reject, {
          ...body,
          statusCode: res.statusCode
        }, body.message || '网络请求失败', showErrorToast);
      },
      fail(err) {
        const error = {
          ...err,
          message: '网络异常，请稍后重试',
          isNetworkError: true
        };
        if (showErrorToast) {
          showError(error.message);
        }
        reject(error);
      },
      complete() {
        if (showLoading) wx.hideLoading();
      }
    });
  });
}

function uploadFile(url, filePath, formData = {}, options = {}) {
  const {
    showLoading = false,
    loadingText = '上传中',
    header = {},
    showErrorToast = true
  } = options;

  if (showLoading) {
    wx.showLoading({ title: loadingText, mask: true });
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url,
      filePath,
      name: 'file',
      formData,
      header: buildUploadHeader(header),
      success(res) {
        try {
          const body = parseUploadResponse(res.data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            if (body.success === false) {
              rejectWithError(reject, body, '上传失败', showErrorToast);
              return;
            }
            resolve(body);
            return;
          }

          rejectWithError(reject, {
            ...body,
            statusCode: res.statusCode
          }, body.message || '上传失败', showErrorToast);
        } catch (error) {
          const nextError = {
            ...error,
            message: error.message || '上传响应解析失败'
          };
          if (showErrorToast) {
            showError(nextError.message);
          }
          reject(nextError);
        }
      },
      fail(err) {
        const error = {
          ...err,
          message: '上传失败，请重试',
          isNetworkError: true
        };
        if (showErrorToast) {
          showError(error.message);
        }
        reject(error);
      },
      complete() {
        if (showLoading) wx.hideLoading();
      }
    });
  });
}

module.exports = {
  request,
  uploadFile,
  parseUploadResponse,
  normalizeErrorPayload
};
