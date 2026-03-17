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

function showError(message) {
  wx.showToast({ title: message || '请求失败', icon: 'none' });
}

function request(url, method = 'GET', data = {}, options = {}) {
  const { showLoading = false, loadingText = '加载中', header = {} } = options;

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
            showError(body.message);
            reject(body);
            return;
          }
          resolve(body);
          return;
        }
        showError(body.message || '网络请求失败');
        reject(res);
      },
      fail(err) {
        showError('网络异常，请稍后重试');
        reject(err);
      },
      complete() {
        if (showLoading) wx.hideLoading();
      }
    });
  });
}

function uploadFile(url, filePath, formData = {}, options = {}) {
  const { showLoading = false, loadingText = '上传中', header = {} } = options;
  if (showLoading) {
    wx.showLoading({ title: loadingText, mask: true });
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url,
      filePath,
      name: 'file',
      formData,
      header: buildHeader(header),
      success(res) {
        try {
          const body = JSON.parse(res.data || '{}');
          if (res.statusCode >= 200 && res.statusCode < 300) {
            if (body.success === false) {
              showError(body.message || '上传失败');
              reject(body);
              return;
            }
            resolve(body);
            return;
          }
          showError(body.message || '上传失败');
          reject(body);
        } catch (error) {
          showError('上传响应解析失败');
          reject(error);
        }
      },
      fail(err) {
        showError('上传失败，请重试');
        reject(err);
      },
      complete() {
        if (showLoading) wx.hideLoading();
      }
    });
  });
}

module.exports = {
  request,
  uploadFile
};
