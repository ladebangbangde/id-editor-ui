function showToast(title = 'Request failed', icon = 'none') {
  wx.showToast({ title, icon, duration: 2200 });
}

function request(url, method = 'GET', data = {}, options = {}) {
  const {
    showLoading = false,
    loadingText = 'Loading...',
    header = {}
  } = options;

  if (showLoading) {
    wx.showLoading({ title: loadingText, mask: true });
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      data,
      header: {
        'content-type': 'application/json',
        ...header
      },
      success(res) {
        const body = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (body.success === false) {
            showToast(body.message || 'Business request failed');
            reject(body);
            return;
          }
          resolve(body);
          return;
        }
        showToast(body.message || 'HTTP request failed');
        reject(res);
      },
      fail(err) {
        showToast('Network error, please try again.');
        reject(err);
      },
      complete() {
        if (showLoading) {
          wx.hideLoading();
        }
      }
    });
  });
}

function uploadFile(url, filePath, formData = {}, options = {}) {
  const {
    showLoading = true,
    loadingText = 'Uploading...',
    name = 'file',
    header = {}
  } = options;

  if (showLoading) {
    wx.showLoading({ title: loadingText, mask: true });
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url,
      filePath,
      name,
      formData,
      header,
      success(res) {
        let body = {};
        try {
          body = JSON.parse(res.data || '{}');
        } catch (error) {
          showToast('Invalid upload response');
          reject(error);
          return;
        }

        if (res.statusCode >= 200 && res.statusCode < 300 && body.success !== false) {
          resolve(body);
          return;
        }

        showToast(body.message || 'Upload failed');
        reject(body);
      },
      fail(err) {
        showToast('Upload failed, please retry.');
        reject(err);
      },
      complete() {
        if (showLoading) {
          wx.hideLoading();
        }
      }
    });
  });
}

module.exports = {
  request,
  uploadFile
};
