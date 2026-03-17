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
      header: {
        'content-type': 'application/json',
        ...header
      },
      success(res) {
        const body = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (body.success === false) {
            wx.showToast({ title: body.message || '请求失败', icon: 'none' });
            reject(body);
            return;
          }
          resolve(body);
          return;
        }
        wx.showToast({ title: body.message || '网络请求失败', icon: 'none' });
        reject(res);
      },
      fail(err) {
        wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
        reject(err);
      },
      complete() {
        if (showLoading) wx.hideLoading();
      }
    });
  });
}

module.exports = {
  request
};
