const { request } = require('./request');

function getBaseUrl() {
  return getApp().globalData.apiBaseUrl;
}

function uploadImage(filePath) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${getBaseUrl()}/upload`,
      filePath,
      name: 'file',
      success(res) {
        try {
          const data = JSON.parse(res.data || '{}');
          resolve(data);
        } catch (error) {
          reject(error);
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

function generateIdPhoto(payload) {
  return request(`${getBaseUrl()}/generate`, 'POST', payload, {
    showLoading: true,
    loadingText: '生成中'
  });
}

function createOrder(payload) {
  return request(`${getBaseUrl()}/orders`, 'POST', payload, {
    showLoading: true,
    loadingText: '提交订单中'
  });
}

module.exports = {
  uploadImage,
  generateIdPhoto,
  createOrder
};
