const { request, uploadFile, normalizeErrorPayload } = require('./request');
const { normalizeEditDraftToPhotoRequest } = require('./photo-edit-contract');

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

function normalizeReviewFields(payload = {}) {
  const normalized = { ...payload };
  normalized.status = normalized.status || normalized.taskStatus || normalized.task_status || '';
  normalized.qualityStatus = normalized.qualityStatus || normalized.quality_status || normalized.status || '';
  normalized.code = normalized.code || normalized.errorCode || normalized.error_code || '';
  normalized.message = normalized.message || normalized.msg || normalized.qualityMessage || normalized.quality_message || '';
  normalized.details = Array.isArray(normalized.details)
    ? normalized.details
    : (Array.isArray(normalized.detailList) ? normalized.detailList : []);
  normalized.riskTips = Array.isArray(normalized.riskTips)
    ? normalized.riskTips
    : (Array.isArray(normalized.risk_tips) ? normalized.risk_tips : []);
  normalized.warnings = Array.isArray(normalized.warnings) ? normalized.warnings : [];
  return normalized;
}

function normalizePhotoProcessFailure(error = {}) {
  const normalized = normalizeErrorPayload(error, '照片检测未通过');
  const data = normalized && typeof normalized.data === 'object' ? normalized.data : {};
  const nestedData = data && typeof data.data === 'object' ? data.data : {};
  const reasonList = Array.isArray(normalized.reasons) ? normalized.reasons : [];
  const warningList = Array.isArray(normalized.warnings) ? normalized.warnings : [];
  const suggestionList = Array.isArray(normalized.suggestions) ? normalized.suggestions : [];

  const reasons = reasonList
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') {
        return {
          type: 'text',
          title: item,
          detail: ''
        };
      }

      if (typeof item === 'object') {
        return {
          type: 'object',
          code: item.code || '',
          title: item.title || item.name || item.message || '',
          detail: item.detail || item.description || item.message || ''
        };
      }

      return null;
    })
    .filter((item) => item && item.title);

  const suggestions = suggestionList
    .map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return item;
      if (typeof item === 'object') return item.title || item.detail || item.message || '';
      return '';
    })
    .filter(Boolean);

  const warnings = warningList
    .map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return item;
      if (typeof item === 'object') return item.title || item.detail || item.message || '';
      return String(item || '');
    })
    .filter(Boolean);

  return {
    ...normalized,
    data,
    taskId: normalized.taskId || (normalized.data && normalized.data.taskId) || '',
    message: normalized.message || data.message || nestedData.message || (normalized.error && normalized.error.message) || '照片检测未通过',
    reasons,
    warnings,
    suggestions
  };
}

function mapCandidateSourceLabel(sourceValue = '') {
  const source = String(sourceValue || '').trim().toLowerCase();
  if (source === 'baidu') return '百度方案';
  if (source === 'legacy' || source === 'local') return '本地方案';
  return source ? '候选方案' : '';
}

function normalizeCandidateItem(item = {}, index = 0) {
  if (!item || typeof item !== 'object') return null;
  const stageSource = item.source || item.engineKey || item.engine_key || item.provider || item.channel || '';
  const source = String(stageSource || '').trim().toLowerCase();
  const sourceLabel = mapCandidateSourceLabel(source);
  const resultUrl = normalizeAssetUrl(
    item.resultUrl || item.result_url || item.imageUrl || item.image_url || ''
  );
  const hdUrl = normalizeAssetUrl(item.hdUrl || item.hd_url || resultUrl || '');
  const imageUrl = normalizeAssetUrl(
    item.imageUrl || item.image_url || resultUrl || hdUrl || item.previewUrl || item.preview_url || ''
  );
  const previewUrl = normalizeAssetUrl(
    item.previewUrl || item.preview_url || imageUrl || resultUrl || hdUrl || ''
  );
  const label = item.label || sourceLabel || `方案${index + 1}`;

  if (!imageUrl && !previewUrl && !resultUrl && !hdUrl) {
    return null;
  }

  return {
    ...item,
    candidateId: item.candidateId || item.candidate_id || item.id || `${source || 'candidate'}_${index + 1}`,
    label,
    source,
    sourceLabel: sourceLabel || label,
    imageUrl,
    previewUrl: previewUrl || imageUrl,
    resultUrl: resultUrl || imageUrl,
    hdUrl: hdUrl || resultUrl || imageUrl
  };
}

function normalizeHistoryItem(item = {}) {
  const normalized = normalizeReviewFields(normalizeAssetPayload(item));
  const scene = normalizeScene(normalized.scene || {});
  const result = normalizeReviewFields(normalizeAssetPayload(normalized.result || {}));
  const widthMm = Number(normalized.widthMm || normalized.width_mm || scene.widthMm || 0);
  const heightMm = Number(normalized.heightMm || normalized.height_mm || scene.heightMm || 0);
  const backgroundColor = normalized.backgroundColor || normalized.background_color
    || result.backgroundColor || result.background_color || '';

  const stageCodesRaw = normalized.stageCodes
    || normalized.stage_codes
    || normalized.stageHistory
    || normalized.stage_history
    || normalized.stages
    || [];
  const stageCodes = Array.isArray(stageCodesRaw)
    ? stageCodesRaw
      .map((entry) => {
        if (!entry) return '';
        if (typeof entry === 'string') return entry;
        if (typeof entry === 'object') {
          return entry.stageCode || entry.stage_code || entry.code || entry.stage || '';
        }
        return '';
      })
      .filter(Boolean)
    : [];
  const candidateRawList = normalized.candidates
    || normalized.candidateList
    || normalized.candidate_list
    || (result && (result.candidates || result.candidateList || result.candidate_list))
    || [];
  const candidates = Array.isArray(candidateRawList)
    ? candidateRawList
      .map((candidate, index) => normalizeCandidateItem(candidate, index))
      .filter(Boolean)
    : [];

  return {
    ...normalized,
    taskId: normalized.taskId || normalized.task_id || normalized.id || '',
    imageId: normalized.imageId || normalized.image_id || normalized.id || '',
    scene,
    result,
    sceneKey: normalized.sceneKey || normalized.scene_key || scene.sceneKey || '',
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
    resultUrl: normalized.resultUrl || normalized.result_url
      || result.resultUrl || result.result_url
      || normalized.downloadUrl || normalized.download_url || '',
    hdUrl: normalized.hdUrl || normalized.hd_url
      || result.hdUrl || result.hd_url
      || normalized.resultUrl || normalized.result_url
      || result.resultUrl || result.result_url
      || '',
    layoutUrl: normalized.layoutUrl || normalized.layout_url
      || result.layoutUrl || result.layout_url
      || normalized.printLayoutUrl || normalized.print_layout_url
      || result.printLayoutUrl || result.print_layout_url
      || '',
    printLayoutUrl: normalized.printLayoutUrl || normalized.print_layout_url
      || result.printLayoutUrl || result.print_layout_url
      || normalized.layoutUrl || normalized.layout_url
      || result.layoutUrl || result.layout_url
      || '',
    qualityStatus: normalized.qualityStatus || normalized.quality_status
      || result.qualityStatus || result.quality_status || '',
    qualityMessage: normalized.qualityMessage || normalized.quality_message
      || result.qualityMessage || result.quality_message || '',
    code: normalized.code || result.code || '',
    message: normalized.message || result.message || '',
    details: Array.isArray(normalized.details)
      ? normalized.details
      : (Array.isArray(result.details) ? result.details : []),
    riskTips: Array.isArray(normalized.riskTips)
      ? normalized.riskTips
      : (Array.isArray(result.riskTips) ? result.riskTips : []),
    sizeCode: normalized.sizeCode || normalized.size_code || result.sizeCode || result.size_code || '',
    warnings: Array.isArray(normalized.warnings)
      ? normalized.warnings
      : (Array.isArray(result.warnings) ? result.warnings : []),
    createdAt: normalized.createdAt || normalized.created_at || '',
    status: normalized.status || normalized.taskStatus || normalized.task_status || '',
    stageCode: normalized.stageCode || normalized.stage_code || normalized.stage || '',
    stageName: normalized.stageName || normalized.stage_name || '',
    stageDescription: normalized.stageDescription || normalized.stage_description || '',
    stageCodes,
    candidates
  };
}

function createPhotoTask(filePath, payload = {}) {
  const requestPayload = normalizeEditDraftToPhotoRequest(payload);
  const formData = {
    sizeCode: requestPayload.sizeCode,
    backgroundColor: requestPayload.backgroundColor
  };

  if (typeof payload.enhance !== 'undefined') {
    formData.enhance = String(payload.enhance);
  }

  return uploadFile(`${getBaseUrl()}/photo/tasks`, filePath, formData, {
    showLoading: false,
    showErrorToast: false
  })
    .then(unwrap)
    .then((result) => normalizeHistoryItem(result))
    .catch((error) => {
      throw normalizePhotoProcessFailure(error);
    });
}

function clearAuthState() {
  const app = getApp();
  if (app && typeof app.clearAuthState === 'function') {
    app.clearAuthState();
  }
}

function healthCheck(appInstance) {
  const app = appInstance || ((typeof getApp === 'function' && getApp()) || null);
  const globalData = app && app.globalData ? app.globalData : null;
  const apiHost = globalData && globalData.apiHost ? globalData.apiHost : '';

  if (!apiHost) {
    console.warn('[api] healthCheck skipped because app/globalData unavailable');
    return Promise.resolve(null);
  }

  return request(`${apiHost}/health`, 'GET', {}, {
    skipAuth: true
  });
}

function wxLogin(payload = {}) {
  return request(`${getBaseUrl()}/auth/wx-login`, 'POST', payload, {
    skipAuth: true,
    showErrorToast: false,
    handleUnauthorized: false
  }).then(unwrap);
}

function getMe() {
  return request(`${getBaseUrl()}/auth/me`, 'GET', {}, {
    skipAuth: true,
    showErrorToast: false,
    handleUnauthorized: false
  }).then(unwrap);
}

function logout() {
  clearAuthState();
  const app = getApp();
  if (app && typeof app.logout === 'function') {
    return app.logout();
  }
  return Promise.resolve();
}

function adminLogin() {
  return request(`${getBaseUrl()}/auth/admin/login`, 'POST', {}, {
    skipAuth: true
  }).then(unwrap);
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
  const requestPayload = normalizeEditDraftToPhotoRequest(payload);
  const formData = {
    sizeCode: requestPayload.sizeCode,
    backgroundColor: requestPayload.backgroundColor
  };

  if (typeof payload.enhance !== 'undefined') {
    formData.enhance = String(payload.enhance);
  }

  const requestLogPayload = {
    endpoint: `${getBaseUrl()}/photo/process`,
    method: 'POST',
    transport: 'multipart/form-data',
    fileField: 'file',
    filePath,
    isLocalTempPath: /^wxfile:\/\//i.test(String(filePath || '')),
    formData
  };
  console.log('[api.processPhoto] request payload', requestLogPayload);

  return uploadFile(`${getBaseUrl()}/photo/process`, filePath, formData, {
    showLoading: true,
    loadingText: '处理中',
    showErrorToast: false
  })
    .then(unwrap)
    .then((result) => {
      console.log('[api.processPhoto] raw response', result);
      const normalized = normalizeReviewFields(normalizeAssetPayload(result));
      console.log('[api.processPhoto] normalized image fields', {
        previewUrl: normalized.previewUrl,
        resultUrl: normalized.resultUrl,
        hdUrl: normalized.hdUrl,
        originalUrl: normalized.originalUrl
      });
      return normalized;
    })
    .catch((error) => {
      throw normalizePhotoProcessFailure(error);
    });
}

function getPhotoTask(taskId, options = {}) {
  const dedupeKey = options.dedupeKey || `task-${taskId}`;
  return request(`${getBaseUrl()}/photo/tasks/${taskId}`, 'GET', {}, { dedupeKey })
    .then(unwrap)
    .then((payload) => {
      console.log('[api.getPhotoTask] raw response', payload);
      const normalized = normalizeHistoryItem(payload);
      console.log('[api.getPhotoTask] normalized image fields', {
        taskId: normalized.taskId,
        previewUrl: normalized.previewUrl,
        resultUrl: normalized.resultUrl,
        hdUrl: normalized.hdUrl,
        printLayoutUrl: normalized.printLayoutUrl
      });
      return normalized;
    });
}

function getPhotoTaskStatus(taskId, options = {}) {
  const dedupeKey = options.dedupeKey || `task-status-${taskId}`;
  return request(`${getBaseUrl()}/photo/tasks/${taskId}/status`, 'GET', {}, { dedupeKey })
    .then(unwrap)
    .then((payload) => {
      const normalized = normalizeHistoryItem(payload);
      const stageText = normalized.stageText || normalized.stage_text || '';
      if (!normalized.stageName && stageText) {
        normalized.stageName = stageText;
      }
      return normalized;
    });
}

function getPhotoHistory(page = 1, pageSize = 10, options = {}) {
  const dedupeKey = options.dedupeKey || `history-${page}-${pageSize}`;
  return request(`${getBaseUrl()}/photo/history?page=${page}&pageSize=${pageSize}`, 'GET', {}, { dedupeKey })
    .then((res) => {
      const payload = res && res.data ? res.data : res;
      console.log('[api.getPhotoHistory] raw payload', payload);
      const success = payload && payload.success === true;
      const code = Number(payload && payload.code);
      const ok = success && code === 0;
      const businessData = payload && payload.data && typeof payload.data === 'object' ? payload.data : {};
      const normalizedPayload = ok ? businessData : (unwrap(payload) || {});

      if (ok) {
        console.log('[api.getPhotoHistory] business success payload', normalizedPayload);
      }

      const listContainer = normalizedPayload || {};
      if (Array.isArray(listContainer)) {
        const normalized = {
          list: listContainer.map(normalizeHistoryItem)
        };
        return normalized;
      }
      if (listContainer && Array.isArray(listContainer.list)) {
        return {
          ...listContainer,
          list: listContainer.list.map(normalizeHistoryItem)
        };
      }
      if (listContainer && Array.isArray(listContainer.items)) {
        const normalizedItems = listContainer.items.map(normalizeHistoryItem);
        return {
          ...listContainer,
          list: normalizedItems,
          items: normalizedItems
        };
      }
      if (listContainer && Array.isArray(listContainer.records)) {
        const normalizedRecords = listContainer.records.map(normalizeHistoryItem);
        return {
          ...listContainer,
          list: normalizedRecords,
          records: normalizedRecords
        };
      }
      return {
        ...listContainer,
        list: []
      };
    })
    .then((normalized) => {
      console.log('[api.getPhotoHistory] normalized image fields', (normalized.list || []).map((item) => ({
        taskId: item.taskId,
        previewUrl: item.previewUrl,
        resultUrl: item.resultUrl,
        hdUrl: item.hdUrl
      })));
      return normalized;
    })
    .catch((error) => {
      // 即便出现 HTTP 非 200，也尽量复用响应体里的业务信息，避免“明明有数据却报错”。
      const normalizedError = normalizeErrorPayload(error, '历史记录加载失败');
      const data = normalizedError && typeof normalizedError.data === 'object' ? normalizedError.data : {};
      const list = data && Array.isArray(data.list) ? data.list : [];
      if (list.length) {
        return {
          ...data,
          list: list.map(normalizeHistoryItem)
        };
      }
      throw normalizedError;
    });
}

function getHomeTemplateConfig(category = '', options = {}) {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  const dedupeKey = options.dedupeKey || `home-template-${category || 'all'}`;
  return request(`${getBaseUrl()}/home/templates${query}`, 'GET', {}, { dedupeKey })
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
  wxLogin,
  getMe,
  clearAuthState,
  logout,
  adminLogin,
  getScenes,
  getSceneDetail,
  getPhotoSpecs,
  processPhoto,
  getPhotoHistory,
  getPhotoTask,
  getPhotoTaskStatus,
  createPhotoTask,
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
  normalizeAssetUrl,
  normalizeAssetPayload,
  normalizeHistoryItem,
};
