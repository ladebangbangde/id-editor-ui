const { request, uploadFile, normalizeErrorPayload } = require('./request');

function getBaseUrl() {
  return getApp().globalData.apiBaseUrl;
}

function getApiOrigin() {
  const app = getApp();
  const host = app.globalData.apiHost || app.globalData.apiBaseUrl || '';
  const match = String(host).match(/^https?:\/\/[^/]+/i);
  return match ? match[0] : '';
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

function isLocalAddress(host = '') {
  const cleanHost = String(host).toLowerCase();
  return cleanHost === '127.0.0.1' || cleanHost === 'localhost' || cleanHost === '0.0.0.0';
}

function normalizeAssetUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const apiOrigin = getApiOrigin();
  if (!apiOrigin) return url;

  const absoluteMatch = url.match(/^(https?:\/\/[^/]+)(\/.*)?$/i);
  if (absoluteMatch) {
    const origin = absoluteMatch[1];
    const path = absoluteMatch[2] || '';
    const host = origin.replace(/^https?:\/\//i, '').split(':')[0];
    if (isLocalAddress(host)) {
      return `${apiOrigin}${path}`;
    }
    return url;
  }

  if (url.startsWith('/')) {
    return `${apiOrigin}${url}`;
  }

  return `${apiOrigin}/${url}`;
}

function normalizeAssetPayload(payload = {}) {
  const normalized = { ...payload };
  const fields = [
    'previewUrl',
    'preview_url',
    'resultUrl',
    'result_url',
    'layoutUrl',
    'layout_url',
    'printLayoutUrl',
    'print_layout_url',
    'hdUrl',
    'hd_url',
    'originalUrl',
    'original_url',
    'downloadUrl',
    'download_url',
    'url'
  ];
  fields.forEach((field) => {
    if (typeof normalized[field] === 'string') {
      normalized[field] = normalizeAssetUrl(normalized[field]);
    }
  });

  normalized.previewUrl = normalized.previewUrl || normalized.preview_url || '';
  normalized.resultUrl = normalized.resultUrl || normalized.result_url || '';
  normalized.layoutUrl = normalized.layoutUrl || normalized.layout_url || '';
  normalized.printLayoutUrl = normalized.printLayoutUrl || normalized.print_layout_url || '';
  normalized.hdUrl = normalized.hdUrl || normalized.hd_url || '';
  normalized.originalUrl = normalized.originalUrl || normalized.original_url || '';
  normalized.downloadUrl = normalized.downloadUrl || normalized.download_url || '';

  return normalized;
}

function normalizePhotoProcessFailure(error = {}) {
  const normalized = normalizeErrorPayload(error, '照片检测未通过');
  return {
    ...normalized,
    data: normalized.data || {},
    taskId: normalized.taskId || (normalized.data && normalized.data.taskId) || ''
  };
}

function normalizeHistoryItem(item = {}) {
  const normalized = normalizeAssetPayload(item);
  const scene = normalizeScene(normalized.scene || {});
  const result = normalizeAssetPayload(normalized.result || {});
  const widthMm = Number(normalized.widthMm || normalized.width_mm || scene.widthMm || 0);
  const heightMm = Number(normalized.heightMm || normalized.height_mm || scene.heightMm || 0);
  const backgroundColor = normalized.backgroundColor || normalized.background_color
    || result.backgroundColor || result.background_color || '';

  return {
    ...normalized,
    imageId: normalized.imageId || normalized.image_id || normalized.id || '',
    scene,
    result,
    sceneName: normalized.sceneName || normalized.scene_name || scene.sceneName || scene.name || '',
    widthMm,
    heightMm,
    sizeText: normalized.sizeText || normalized.size_text || normalized.size
      || (widthMm && heightMm ? `${widthMm}×${heightMm}mm` : ''),
    backgroundColor,
    backgroundColorLabel: normalized.backgroundColorLabel || normalized.background_color_label || backgroundColor,
    previewUrl: normalized.previewUrl || normalized.preview_url
      || result.previewUrl || result.preview_url
      || normalized.originalUrl || normalized.original_url || '',
    createdAt: normalized.createdAt || normalized.created_at || '',
    status: normalized.status || normalized.taskStatus || normalized.task_status || ''
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
  })
    .then(unwrap)
    .then((payload) => normalizeAssetPayload(payload));
}

function generateImage(payload) {
  return request(`${getBaseUrl()}/images/generate`, 'POST', payload, {
    showLoading: true,
    loadingText: '生成中'
  })
    .then(unwrap)
    .then((result) => normalizeAssetPayload(result));
}

function getPhotoSpecs() {
  return request(`${getBaseUrl()}/photo/specs`)
    .then(unwrap)
    .then((payload) => ({
      backgroundColors: Array.isArray(payload.backgroundColors) ? payload.backgroundColors : [],
      sizeCodes: Array.isArray(payload.sizeCodes) ? payload.sizeCodes : [],
      papers: Array.isArray(payload.papers) ? payload.papers : [],
      formats: Array.isArray(payload.formats) ? payload.formats : []
    }));
}

function processPhoto(filePath, payload = {}) {
  const formData = {
    sizeCode: payload.sizeCode,
    backgroundColor: payload.backgroundColor
  };

  if (typeof payload.enhance !== 'undefined') {
    formData.enhance = String(payload.enhance);
  }

  return uploadFile(`${getBaseUrl()}/photo/process`, filePath, formData, {
    showLoading: true,
    loadingText: '处理中',
    showErrorToast: false
  })
    .then(unwrap)
    .then((result) => normalizeAssetPayload(result))
    .catch((error) => {
      throw normalizePhotoProcessFailure(error);
    });
}

function getPhotoTask(taskId) {
  return request(`${getBaseUrl()}/photo/tasks/${taskId}`)
    .then(unwrap)
    .then((payload) => normalizeAssetPayload(payload));
}

function getHomeTemplateConfig(category = '') {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return request(`${getBaseUrl()}/home/templates${query}`)
    .then(unwrap)
    .then((payload) => ({
      ...payload,
      tabs: Array.isArray(payload.tabs) ? payload.tabs : [],
      templates: Array.isArray(payload.templates) ? payload.templates : []
    }));
}

function getHistory(page = 1, pageSize = 10) {
  return request(`${getBaseUrl()}/images/history?page=${page}&pageSize=${pageSize}`)
    .then(unwrap)
    .then((payload) => {
      if (Array.isArray(payload)) {
        return {
          list: payload.map(normalizeHistoryItem)
        };
      }
      if (payload && Array.isArray(payload.list)) {
        return {
          ...payload,
          list: payload.list.map(normalizeHistoryItem)
        };
      }
      if (payload && Array.isArray(payload.items)) {
        return {
          ...payload,
          list: payload.items.map(normalizeHistoryItem),
          items: payload.items.map(normalizeHistoryItem)
        };
      }
      if (payload && Array.isArray(payload.records)) {
        return {
          ...payload,
          list: payload.records.map(normalizeHistoryItem),
          records: payload.records.map(normalizeHistoryItem)
        };
      }
      return {
        ...payload,
        list: []
      };
    });
}

function getImageDetail(imageId) {
  return request(`${getBaseUrl()}/images/${imageId}/detail`)
    .then(unwrap)
    .then((payload) => normalizeHistoryItem(payload));
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
  return request(`${getBaseUrl()}/download/${resultId}/preview`)
    .then(unwrap)
    .then((payload) => normalizeAssetPayload(payload));
}

function downloadHd(resultId) {
  return request(`${getBaseUrl()}/download/${resultId}/hd`)
    .then(unwrap)
    .then((payload) => normalizeAssetPayload(payload));
}

function downloadPrint(resultId) {
  return request(`${getBaseUrl()}/download/${resultId}/print`)
    .then(unwrap)
    .then((payload) => normalizeAssetPayload(payload));
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
  getPhotoSpecs,
  processPhoto,
  getPhotoTask,
  // legacy APIs, kept for compatibility only.
  uploadImage,
  generateImage,
  generateIdPhoto,
  getHomeTemplateConfig,
  getHistory,
  getImageDetail,
  getTask,
  createOrder,
  getOrder,
  mockPay,
  downloadPreview,
  downloadHd,
  downloadPrint,
  getAdminStats,
  normalizeScene,
  normalizeAssetUrl,
  normalizeAssetPayload,
  normalizeHistoryItem,
  normalizePhotoProcessFailure
};
