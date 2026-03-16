const { request } = require('./request');
const { uploadImageFile } = require('./upload');

function getApiBaseUrl() {
  const app = getApp();
  return app.globalData.apiBaseUrl;
}

function getServerBaseUrl() {
  const app = getApp();
  return app.globalData.serverBaseUrl;
}

function joinQuery(params = {}) {
  const pairs = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

function mapHistoryItem(item = {}) {
  const result = item.latestResult || item.result || {};
  const task = item.latestTask || item.task || {};
  return {
    imageId: item.imageId || item.id || '',
    resultId: result.resultId || result.id || '',
    taskId: task.taskId || task.id || '',
    originalUrl: item.originalUrl || '',
    previewUrl: result.previewUrl || '',
    hdUrl: result.hdUrl || '',
    printLayoutUrl: result.printLayoutUrl || '',
    sceneKey: result.sceneKey || task.sceneKey || item.sceneKey || '',
    sizeType: result.sceneKey || task.sceneKey || item.sceneKey || '',
    backgroundColor: result.backgroundColor || task.backgroundColor || 'white',
    status: task.status || item.status || 'pending',
    createdAt: item.createdAt || task.createdAt || result.createdAt || ''
  };
}

function getHealth() {
  return request(`${getServerBaseUrl()}/health`, 'GET');
}

function getMe() {
  return request(`${getApiBaseUrl()}/auth/me`, 'GET');
}

function adminLogin() {
  return request(`${getApiBaseUrl()}/auth/admin/login`, 'POST');
}

function getScenes() {
  return request(`${getApiBaseUrl()}/scenes`, 'GET');
}

function getSceneDetail(sceneKey) {
  return request(`${getApiBaseUrl()}/scenes/${sceneKey}`, 'GET');
}

function uploadImage(filePath) {
  return uploadImageFile(filePath);
}

function generateIdPhoto(payload) {
  return request(`${getApiBaseUrl()}/images/generate`, 'POST', payload, {
    showLoading: true,
    loadingText: 'Generating...'
  });
}

function getTask(taskId) {
  return request(`${getApiBaseUrl()}/tasks/${taskId}`, 'GET');
}

function getImageHistory(page = 1, pageSize = 10) {
  const query = joinQuery({ page, pageSize });
  return request(`${getApiBaseUrl()}/images/history${query}`, 'GET', {}, {
    showLoading: true,
    loadingText: 'Loading history...'
  });
}

function getImageDetail(imageId) {
  return request(`${getApiBaseUrl()}/images/${imageId}/detail`, 'GET', {}, {
    showLoading: true,
    loadingText: 'Loading detail...'
  });
}

function createOrder(payload) {
  return request(`${getApiBaseUrl()}/orders`, 'POST', payload, {
    showLoading: true,
    loadingText: 'Creating order...'
  });
}

function getOrder(orderId) {
  return request(`${getApiBaseUrl()}/orders/${orderId}`, 'GET');
}

function mockPayOrder(orderId) {
  return request(`${getApiBaseUrl()}/orders/${orderId}/mock-pay`, 'POST', {}, {
    showLoading: true,
    loadingText: 'Paying...'
  });
}

function getDownloadPreview(resultId) {
  return request(`${getApiBaseUrl()}/download/${resultId}/preview`, 'GET');
}

function getDownloadHd(resultId) {
  return request(`${getApiBaseUrl()}/download/${resultId}/hd`, 'GET');
}

function getDownloadPrint(resultId) {
  return request(`${getApiBaseUrl()}/download/${resultId}/print`, 'GET');
}

function getAdminStats(adminToken) {
  return request(`${getApiBaseUrl()}/admin/stats`, 'GET', {}, {
    header: {
      'x-admin-token': adminToken
    }
  });
}

module.exports = {
  mapHistoryItem,
  getHealth,
  getMe,
  adminLogin,
  getScenes,
  getSceneDetail,
  uploadImage,
  generateIdPhoto,
  getTask,
  getImageHistory,
  getImageDetail,
  createOrder,
  getOrder,
  mockPayOrder,
  getDownloadPreview,
  getDownloadHd,
  getDownloadPrint,
  getAdminStats
};
