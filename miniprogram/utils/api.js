const { request } = require('./request');
const { uploadImageFile } = require('./upload');

function getBaseUrl() {
  const app = getApp();
  return app.globalData.apiBaseUrl;
}

function uploadImage(filePath) {
  return uploadImageFile(filePath);
}

function generateIdPhoto(payload) {
  return request(`${getBaseUrl()}/generate`, 'POST', payload, {
    showLoading: true,
    loadingText: 'Generating...'
  });
}

function createOrder(payload) {
  return request(`${getBaseUrl()}/orders`, 'POST', payload, {
    showLoading: true,
    loadingText: 'Creating order...'
  });
}

function getMyImages(userId) {
  return request(`${getBaseUrl()}/images/my`, 'GET', { userId }, {
    showLoading: true,
    loadingText: 'Loading history...'
  });
}

function getImageDetail(imageId) {
  return request(`${getBaseUrl()}/images/detail`, 'GET', { imageId }, {
    showLoading: true,
    loadingText: 'Loading detail...'
  });
}

module.exports = {
  uploadImage,
  generateIdPhoto,
  createOrder,
  getMyImages,
  getImageDetail
};
