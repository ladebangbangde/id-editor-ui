const { request } = require('./request');

function getBaseUrl() {
  return getApp().globalData.apiBaseUrl;
}

function unwrap(response) {
  return response && response.data !== undefined ? response.data : response;
}

function uploadImage(filePath) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${getBaseUrl()}/upload`,
      filePath,
      name: 'file',
      success(res) {
        try {
          const body = JSON.parse(res.data || '{}');
          if (res.statusCode >= 200 && res.statusCode < 300 && body.success !== false) {
            resolve(unwrap(body));
            return;
          }
          wx.showToast({ title: body.message || '上传失败', icon: 'none' });
          reject(body);
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

function getScenes() {
  return request(`${getBaseUrl()}/scenes`).then(unwrap);
}

function generateImage(payload) {
  return request(`${getBaseUrl()}/images/generate`, 'POST', payload, {
    showLoading: true,
    loadingText: '生成中'
  }).then(unwrap);
}

function getTask(taskId) {
  return request(`${getBaseUrl()}/tasks/${taskId}`).then(unwrap);
}

function getHistory(page = 1, pageSize = 20) {
  return request(`${getBaseUrl()}/images/history?page=${page}&pageSize=${pageSize}`).then(unwrap);
}

function getImageDetail(imageId) {
  return request(`${getBaseUrl()}/images/${imageId}/detail`).then(unwrap);
}

function createOrder(payload) {
  return request(`${getBaseUrl()}/orders`, 'POST', payload, {
    showLoading: true,
    loadingText: '提交订单中'
  }).then(unwrap);
}

function mockPay(orderId) {
  return request(`${getBaseUrl()}/orders/${orderId}/mock-pay`, 'POST').then(unwrap);
}

function getDownloadUrl(resultId, type) {
  return request(`${getBaseUrl()}/download/${resultId}/${type}`).then(unwrap);
}

module.exports = {
  uploadImage,
  getScenes,
  generateImage,
  getTask,
  getHistory,
  getImageDetail,
  createOrder,
  mockPay,
  getDownloadUrl
};
