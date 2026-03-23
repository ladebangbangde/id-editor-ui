function getAppSafe() {
  try {
    return getApp();
  } catch (error) {
    return null;
  }
}

function buildHeader(header = {}) {
  const app = getAppSafe();
  const authToken = app && app.globalData ? app.globalData.authToken : '';
  const authHeader = authToken
    ? { Authorization: `Bearer ${authToken}` }
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

function pickMessage(payload = {}, fallbackMessage = '请求失败') {
  const data = payload && typeof payload.data === 'object' ? payload.data : {};
  return payload.message
    || payload.msg
    || data.message
    || data.msg
    || fallbackMessage;
}

function normalizeErrorPayload(payload = {}, fallbackMessage = '请求失败') {
  const data = payload && typeof payload.data === 'object' ? payload.data : {};
  const statusCode = Number(payload.statusCode || payload.code || data.code || 0);

  return {
    ...payload,
    message: pickMessage(payload, fallbackMessage),
    code: payload.code || statusCode || '',
    statusCode,
    data,
    taskId: payload.taskId || data.taskId || '',
    reasons: normalizeList(payload.reasons || data.reasons),
    suggestions: normalizeList(payload.suggestions || data.suggestions),
    isBusinessError: true,
    isAuthError: statusCode === 401
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

async function ensureAuthReady(options = {}) {
  const { skipAuth = false } = options;
  if (skipAuth) {
    return;
  }

  const app = getAppSafe();
  if (!app || !app.globalData || app.globalData.authToken || typeof app.ensureLogin !== 'function') {
    return;
  }

  try {
    await app.ensureLogin({ silent: true });
  } catch (error) {
    console.warn('ensureLogin before request failed', error);
  }
}

function handleUnauthorized(payload = {}, options = {}) {
  const app = getAppSafe();

  if (options.showErrorToast !== false) {
    showError(payload.message || '登录状态已失效，正在重新登录');
  }

  if (app && typeof app.handleUnauthorized === 'function') {
    app.handleUnauthorized(payload);
  } else if (app && typeof app.clearAuthState === 'function') {
    app.clearAuthState({ keepError: true });
  }
}

async function request(url, method = 'GET', data = {}, options = {}) {
  const {
    showLoading = false,
    loadingText = '加载中',
    header = {},
    showErrorToast = true,
    handleUnauthorized: shouldHandleUnauthorized = true
  } = options;

  await ensureAuthReady(options);

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
            const errorCode = Number(body.code || (body.data && body.data.code) || 0);
            if (errorCode === 401 && shouldHandleUnauthorized) {
              handleUnauthorized(normalizeErrorPayload(body, '登录状态已失效'), { showErrorToast });
              rejectWithError(reject, body, '登录状态已失效', false);
              return;
            }

            rejectWithError(reject, body, pickMessage(body, '请求失败'), showErrorToast);
            return;
          }
          resolve(body);
          return;
        }

        if (res.statusCode === 401) {
          const payload = {
            ...body,
            statusCode: res.statusCode
          };

          if (shouldHandleUnauthorized) {
            handleUnauthorized(normalizeErrorPayload(payload, '登录状态已失效'), { showErrorToast });
          }

          rejectWithError(reject, payload, pickMessage(payload, '登录状态已失效'), false);
          return;
        }

        rejectWithError(reject, {
          ...body,
          statusCode: res.statusCode
        }, pickMessage(body, '网络请求失败'), showErrorToast);
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

async function uploadFile(url, filePath, formData = {}, options = {}) {
  const {
    showLoading = false,
    loadingText = '上传中',
    header = {},
    showErrorToast = true,
    handleUnauthorized: shouldHandleUnauthorized = true
  } = options;

  await ensureAuthReady(options);

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
              const errorCode = Number(body.code || (body.data && body.data.code) || 0);
              if (errorCode === 401 && shouldHandleUnauthorized) {
                handleUnauthorized(normalizeErrorPayload(body, '登录状态已失效'), { showErrorToast });
                rejectWithError(reject, body, '登录状态已失效', false);
                return;
              }

              rejectWithError(reject, body, pickMessage(body, '上传失败'), showErrorToast);
              return;
            }
            resolve(body);
            return;
          }

          if (res.statusCode === 401) {
            const payload = {
              ...body,
              statusCode: res.statusCode
            };

            if (shouldHandleUnauthorized) {
              handleUnauthorized(normalizeErrorPayload(payload, '登录状态已失效'), { showErrorToast });
            }

            rejectWithError(reject, payload, pickMessage(payload, '登录状态已失效'), false);
            return;
          }

          rejectWithError(reject, {
            ...body,
            statusCode: res.statusCode
          }, pickMessage(body, '上传失败'), showErrorToast);
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
