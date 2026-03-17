const { request, uploadFile } = require('./request');

function getBaseUrl() {
  return getApp().globalData.apiBaseUrl;
}

function unwrap(res) {
  if (!res) return {};
  if (Object.prototype.hasOwnProperty.call(res, 'data')) {
    return res.data || {};
  }
  return res;
}

function normalizeScene(scene = {}) {
  const sceneKey = scene.sceneKey || scene.scene_key || '';
  const sceneName = scene.sceneName || scene.scene_name || scene.name || '';
  const widthMm = Number(scene.widthMm || scene.width_mm || 0);
  const heightMm = Number(scene.heightMm || scene.height_mm || 0);
  const pixelWidth = Number(scene.pixelWidth || scene.pixel_width || 0);
  const pixelHeight = Number(scene.pixelHeight || scene.pixel_height || 0);

  return {
    ...scene,
    sceneKey,
    sceneName,
    name: sceneName,
    widthMm,
    heightMm,
    pixelWidth,
    pixelHeight,
    allowBeauty: Object.prototype.hasOwnProperty.call(scene, 'allowBeauty')
      ? scene.allowBeauty
      : scene.allow_beauty,
    allowPrint: Object.prototype.hasOwnProperty.call(scene, 'allowPrint')
      ? scene.allowPrint
      : scene.allow_print,
    isActive: Object.prototype.hasOwnProperty.call(scene, 'isActive')
      ? scene.isActive
      : scene.is_active
  };
}

function healthCheck() {
  const app = getApp();
  return request(`${app.globalData.apiHost}/health`);
}

function getMe() {
  return request(`${getBaseUrl()}/auth/me`).then(unwrap);
}

function adminLogin() {
  return request(`${getBaseUrl()}/auth/admin/login`, 'POST').then(unwrap);
}

function getScenes() {
  return request(`${getBaseUrl()}/scenes`).then((res) => {
    const data = unwrap(res);
    if (!Array.isArray(data)) return [];

    return data
      .map(normalizeScene)
      .filter((scene) => scene.sceneKey);
  });
}

function getSceneDetail(sceneKey) {
  return request(`${getBaseUrl()}/scenes/${sceneKey}`)
    .then(unwrap)
    .then((scene) => normalizeScene(scene));
}

function uploadImage(filePath) {
  return uploadFile(`${getBaseUrl()}/upload`, filePath, {}, {
    showLoading: true,
    loadingText: '上传中'
  }).then(unwrap);
}

function generateImage(payload) {
  return request(`${getBaseUrl()}/images/generate`, 'POST', payload, {
    showLoading: true,
    loadingText: '生成中'
  }).then(unwrap);
}

function getHistory(page = 1, pageSize = 10) {
  return request(`${getBaseUrl()}/images/history?page=${page}&pageSize=${pageSize}`).then(unwrap);
}

function getImageDetail(imageId) {
  return request(`${getBaseUrl()}/images/${imageId}/detail`).then(unwrap);
}

function getTask(taskId) {
  return request(`${getBaseUrl()}/tasks/${taskId}`).then(unwrap);
}

function createOrder(payload) {
  return request(`${getBaseUrl()}/orders`, 'POST', payload, {
    showLoading: true,
    loadingText: '创建订单中'
  }).then(unwrap);
}

function getOrder(orderId) {
  return request(`${getBaseUrl()}/orders/${orderId}`).then(unwrap);
}

function mockPay(orderId) {
  return request(`${getBaseUrl()}/orders/${orderId}/mock-pay`, 'POST', {}, {
    showLoading: true,
    loadingText: '支付处理中'
  }).then(unwrap);
}

function downloadPreview(resultId) {
  return request(`${getBaseUrl()}/download/${resultId}/preview`).then(unwrap);
}

function downloadHd(resultId) {
  return request(`${getBaseUrl()}/download/${resultId}/hd`).then(unwrap);
}

function downloadPrint(resultId) {
  return request(`${getBaseUrl()}/download/${resultId}/print`).then(unwrap);
}

function getAdminStats(token) {
  return request(`${getBaseUrl()}/admin/stats`, 'GET', {}, {
    header: {
      'x-admin-token': token
    }
  }).then(unwrap);
}

const generateIdPhoto = generateImage;

module.exports = {
  healthCheck,
  getMe,
  adminLogin,
  getScenes,
  getSceneDetail,
  uploadImage,
  generateImage,
  generateIdPhoto,
  getHistory,
  getImageDetail,
  getTask,
  createOrder,
  getOrder,
  mockPay,
  downloadPreview,
  downloadHd,
  downloadPrint,
  getAdminStats
};
