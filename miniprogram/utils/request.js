const { runWithDedupe } = require('./request-dedupe');
const AUTH_EXPIRED_BUSINESS_CODE = 9003;

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
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return item.trim();
      return item;
    })
    .filter(Boolean);
}

function pickPayloadFromResponse(payload = {}) {
  if (!payload || typeof payload !== 'object') return {};
  const responseData = payload.response && payload.response.data;
  if (responseData && typeof responseData === 'object') {
    return responseData;
  }
  if (payload.data && typeof payload.data === 'object') {
    return payload.data;
  }
  return payload;
}

function pickMessage(payload = {}, fallbackMessage = '请求失败') {
  const business = pickPayloadFromResponse(payload);
  const data = business && typeof business.data === 'object' ? business.data : {};
  return payload.message
    || payload.msg
    || business.message
    || business.msg
    || data.message
    || data.msg
    || fallbackMessage;
}

function normalizeErrorPayload(payload = {}, fallbackMessage = '请求失败') {
  const business = pickPayloadFromResponse(payload);
  const data = business && typeof business.data === 'object' ? business.data : {};
  const nestedData = data && typeof data.data === 'object' ? data.data : {};
  const statusCode = Number(payload.statusCode || business.statusCode || 0);
  const businessCode = Number(
    payload.businessCode
    || business.businessCode
    || business.code
    || data.businessCode
    || data.code
    || 0
  );
  const reasons = normalizeList(
    business.reasons || data.reasons || nestedData.reasons || payload.reasons
  );
  const warnings = normalizeList(
    business.warnings || data.warnings || nestedData.warnings || payload.warnings
  );
  const suggestions = normalizeList(
    business.suggestions || data.suggestions || nestedData.suggestions || payload.suggestions
  );

  return {
    ...business,
    ...payload,
    message: pickMessage(business, fallbackMessage),
    code: business.code || payload.code || businessCode || statusCode || '',
    businessCode,
    statusCode,
    data: Object.keys(data).length ? data : (business.data || {}),
    taskId: business.taskId || payload.taskId || data.taskId || nestedData.taskId || '',
    reasons,
    warnings,
    suggestions,
    detailTitle: business.detailTitle || payload.detailTitle || data.detailTitle || nestedData.detailTitle || data.title || '',
    detailSummary: business.detailSummary || payload.detailSummary || data.detailSummary || nestedData.detailSummary || data.summary || '',
    isBusinessError: true,
    isAuthError: statusCode === 401
      || businessCode === AUTH_EXPIRED_BUSINESS_CODE
      || /token\s*已过期/i.test(pickMessage(payload, fallbackMessage))
  };
}

function isAuthExpiredPayload(payload = {}) {
  const normalized = normalizeErrorPayload(payload, '登录状态已失效');
  return Boolean(normalized.isAuthError);
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
  if (!app || !app.globalData || typeof app.syncLoginStatus !== 'function') {
    return;
  }

  const { authToken, authReady, authStatus, authLoading, me } = app.globalData;
  const hasToken = Boolean(authToken);
  const status = authStatus || 'idle';
  const shouldBypassLogin = hasToken && authReady && status !== 'loading' && status !== 'restoring';

  console.info('[auth] ensureAuthReady(before)', {
    authToken: hasToken ? '[exists]' : '',
    authLoading: Boolean(authLoading),
    authReady: Boolean(authReady),
    authStatus: status,
    me: me || null,
    shouldBypassLogin
  });

  if (shouldBypassLogin) {
    return;
  }

  try {
    await app.syncLoginStatus();
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

function isWxLoginRequest(url = '') {
  return String(url).indexOf('/api/auth/wx-login') !== -1;
}

function isAuthLoginRequest(url = '') {
  const fullUrl = String(url || '');
  return fullUrl.indexOf('/api/auth/wx-login') !== -1
    || fullUrl.indexOf('/api/auth/login') !== -1;
}

function logWxLoginRequest(url, method, data) {
  if (!isWxLoginRequest(url)) {
    return;
  }

  console.info('[auth] wx-login request detail:', {
    url,
    method,
    payload: data
  });
}

function logWxLoginResponseError(url, statusCode, body) {
  if (!isWxLoginRequest(url)) {
    return;
  }

  console.error('[auth] wx-login response error:', {
    statusCode,
    responseBody: body
  });
}


async function request(url, method = 'GET', data = {}, options = {}) {
  const {
    showLoading = false,
    loadingText = '加载中',
    header = {},
    showErrorToast = true,
    dedupeKey = '',
    handleUnauthorized: shouldHandleUnauthorized = true
  } = options;

  const executor = async () => {
    await ensureAuthReady(options);

    if (showLoading) {
      wx.showLoading({ title: loadingText, mask: true });
    }

    logWxLoginRequest(url, method, data);

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
            const errorCode = Number(body.code || body.businessCode || (body.data && body.data.code) || 0);
            logWxLoginResponseError(url, 200, body);
            if (errorCode === 401 || isAuthExpiredPayload(body)) {
              const authError = normalizeErrorPayload(body, '登录状态已失效');
              if (shouldHandleUnauthorized && !isAuthLoginRequest(url)) {
                handleUnauthorized(authError, { showErrorToast });
              }
              authError.name = 'AuthExpiredError';
              authError.isAuthExpired = true;
              reject(authError);
              return;
            }

            rejectWithError(reject, body, pickMessage(body, '请求失败'), showErrorToast);
            return;
          }
          resolve(body);
          return;
        }

        if (res.statusCode === 401 || isAuthExpiredPayload(body)) {
          logWxLoginResponseError(url, res.statusCode, body);
          const payload = {
            ...body,
            statusCode: res.statusCode
          };
          const authError = normalizeErrorPayload(payload, '登录状态已失效');
          authError.name = 'AuthExpiredError';
          authError.isAuthExpired = true;

          if (shouldHandleUnauthorized && !isAuthLoginRequest(url)) {
            handleUnauthorized(authError, { showErrorToast });
          }
          reject(authError);
          return;
        }

        logWxLoginResponseError(url, res.statusCode, body);
        rejectWithError(reject, {
          ...body,
          statusCode: res.statusCode
        }, pickMessage(body, '网络请求失败'), showErrorToast);
      },
      fail(err) {
        logWxLoginResponseError(url, 0, err);
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
  };

  if (dedupeKey) {
    return runWithDedupe(`req:${method}:${url}:${dedupeKey}`, executor);
  }
  return executor();
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
              const errorCode = Number(body.code || body.businessCode || (body.data && body.data.code) || 0);
              logWxLoginResponseError(url, 200, body);
              if (errorCode === 401 || isAuthExpiredPayload(body)) {
                const authError = normalizeErrorPayload(body, '登录状态已失效');
                authError.name = 'AuthExpiredError';
                authError.isAuthExpired = true;
                if (shouldHandleUnauthorized && !isAuthLoginRequest(url)) {
                  handleUnauthorized(authError, { showErrorToast });
                }
                reject(authError);
                return;
              }

              rejectWithError(reject, body, pickMessage(body, '上传失败'), showErrorToast);
              return;
            }
            resolve(body);
            return;
          }

          if (res.statusCode === 401 || isAuthExpiredPayload(body)) {
            logWxLoginResponseError(url, res.statusCode, body);
            const payload = {
              ...body,
              statusCode: res.statusCode
            };
            const authError = normalizeErrorPayload(payload, '登录状态已失效');
            authError.name = 'AuthExpiredError';
            authError.isAuthExpired = true;

            if (shouldHandleUnauthorized && !isAuthLoginRequest(url)) {
              handleUnauthorized(authError, { showErrorToast });
            }

            reject(authError);
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
        logWxLoginResponseError(url, 0, err);
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
