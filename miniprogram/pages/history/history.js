const { getPhotoHistory } = require('../../utils/api');
const { formatTime } = require('../../utils/format');
const { cleanUrl, isLikelyLocalPath } = require('../../utils/image-url');
const { getFriendlySceneName, getFriendlySizeText } = require('../../utils/photo-display');
const { getBackgroundColorLabel } = require('../../utils/photo-edit-contract');
const { getPreviewImage } = require('../../utils/image-resource');
const { getCache, setCache } = require('../../utils/page-cache');

function buildStatus(item = {}) {
  const rawStatus = String(item.status || '').trim().toLowerCase();
  const statusMap = {
    success: 'success', succeeded: 'success', completed: 'success', done: 'success',
    failed: 'failed', fail: 'failed', error: 'failed',
    processing: 'processing', pending: 'processing', queued: 'processing', running: 'processing'
  };
  if (rawStatus && statusMap[rawStatus]) return statusMap[rawStatus];

  const rawQualityStatus = String(item.qualityStatus || '').trim().toLowerCase();
  const qualityMap = { passed: 'success', pass: 'success', warning: 'success', failed: 'failed', fail: 'failed' };
  if (rawQualityStatus && qualityMap[rawQualityStatus]) return qualityMap[rawQualityStatus];
  return 'processing';
}

const EDIT_STORAGE_KEY = 'history_edit_map';
const DELETE_STORAGE_KEY = 'history_deleted_ids';
const HISTORY_CACHE_KEY = 'history:list:first-page';
const HISTORY_CACHE_TTL = 20000;

function normalizeRecord(item = {}) {
  const id = item.taskId || item.imageId || item.id;
  const warnings = Array.isArray(item.warnings) ? item.warnings : [];
  const backgroundColor = item.backgroundColorLabel
    || (item.backgroundColor ? getBackgroundColorLabel(item.backgroundColor) : '')
    || item.backgroundColor
    || '--';
  const friendlyName = getFriendlySceneName(item, '证件照');
  const friendlySizeText = getFriendlySizeText(item);
  const previewUrl = getPreviewImage(item);
  const normalizedCandidates = Array.isArray(item.candidates)
    ? item.candidates
      .map((candidate, index) => {
        const source = String(candidate.source || '').trim().toLowerCase();
        const sourceLabel = candidate.sourceLabel
          || (source === 'baidu' ? '百度方案' : ((source === 'legacy' || source === 'local') ? '本地方案' : '候选方案'));
        const imageUrl = getPreviewImage(candidate);
        if (!imageUrl) return null;
        return {
          candidateId: candidate.candidateId || `${id || 'history'}_${index + 1}`,
          label: candidate.label || sourceLabel || `方案${index + 1}`,
          source,
          sourceLabel,
          imageUrl
        };
      })
      .filter(Boolean)
    : [];
  const displayCandidates = normalizedCandidates.length
    ? normalizedCandidates.slice(0, 2)
    : [{
      candidateId: `${id || 'history'}_default`,
      label: '主图',
      source: '',
      sourceLabel: '',
      imageUrl: previewUrl
    }];

  return {
    id,
    taskId: id,
    imageId: item.imageId || '',
    name: friendlyName,
    sceneName: friendlyName,
    size: friendlySizeText,
    sizeText: friendlySizeText,
    sizeCode: item.sizeCode || '',
    background: backgroundColor,
    backgroundColor,
    imageUrl: previewUrl,
    previewUrl,
    displayUrl: previewUrl,
    resultUrl: item.resultUrl || '',
    createdAt: formatTime(item.createdAt),
    status: buildStatus(item),
    qualityStatus: item.qualityStatus || '',
    qualityMessage: item.qualityMessage || '',
    warnings,
    candidates: displayCandidates,
    selected: false
  };
}

function logImageUrlRisk(tag, url, itemId) {
  const cleaned = cleanUrl(url);
  if (!cleaned) {
    console.warn(`[history] ${tag} is empty`, itemId);
    return;
  }
  if (/^http:\/\//i.test(cleaned)) {
    console.warn(`[history] ${tag} uses http, might be blocked on device`, itemId, cleaned);
  }
  if (isLikelyLocalPath(cleaned)) {
    console.warn(`[history] ${tag} looks like local/private address`, itemId, cleaned);
  }
}

function getStorageValue(key, fallback) {
  try {
    const value = wx.getStorageSync(key);
    if (value === '' || value === undefined || value === null) return fallback;
    return value;
  } catch (error) {
    return fallback;
  }
}

function setStorageValue(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (error) {
    // ignore storage write failures
  }
}

Page({
  data: {
    list: [],
    loading: false,
    loadFailed: false,
    loadErrorMessage: '',
    page: 1,
    pageSize: 12,
    total: 0,
    hasMore: true,
    loadingMore: false,
    manageMode: false,
    selectedIds: [],
    checkAll: false,
    editingItem: null,
    editForm: {
      name: '',
      size: '',
      background: ''
    },
    submitting: false,
    deleting: false
  },

  onLoad() {
    const cached = getCache(HISTORY_CACHE_KEY);
    if (cached && Array.isArray(cached.list) && cached.list.length) {
      this.setData({
        list: cached.list,
        total: cached.total || cached.list.length,
        page: cached.page || 1,
        hasMore: Boolean(cached.hasMore),
        loadFailed: false
      });
      this.hasLoaded = true;
    }
  },

  onShow() {
    if (!this.hasLoaded) {
      this.fetchHistory({ reset: true, showLoading: true });
      this.hasLoaded = true;
      return;
    }
    if (this.shouldRefresh) {
      this.fetchHistory({ reset: true, showLoading: false });
      this.shouldRefresh = false;
    }
  },

  onPullDownRefresh() {
    this.fetchHistory({ reset: true, showLoading: false, fromPullDown: true });
  },

  onReachBottom() {
    this.fetchHistory({ reset: false, showLoading: false });
  },

  getEditedMap() {
    return getStorageValue(EDIT_STORAGE_KEY, {});
  },

  getDeletedIds() {
    return getStorageValue(DELETE_STORAGE_KEY, []);
  },

  saveEditedMap(map) {
    setStorageValue(EDIT_STORAGE_KEY, map);
  },

  saveDeletedIds(ids) {
    setStorageValue(DELETE_STORAGE_KEY, ids);
  },

  applyLocalMutations(list = []) {
    const editMap = this.getEditedMap();
    const deletedIds = this.getDeletedIds();

    return list
      .filter((item) => !deletedIds.includes(item.id))
      .map((item) => {
        const edited = editMap[item.id] || {};
        const name = edited.name || item.name;
        const size = edited.size || item.size;
        const background = edited.background || item.background;
        return {
          ...item,
          ...edited,
          name,
          sceneName: name,
          size,
          sizeText: size,
          background,
          backgroundColor: background,
          selected: false
        };
      });
  },

  syncSelection(list = this.data.list, selectedIds = this.data.selectedIds) {
    const validSelectedIds = selectedIds.filter((id) => list.some((item) => item.id === id));
    const nextList = list.map((item) => ({
      ...item,
      selected: validSelectedIds.includes(item.id)
    }));
    const checkAll = !!nextList.length && nextList.every((item) => item.selected);

    this.setData({
      list: nextList,
      selectedIds: validSelectedIds,
      checkAll
    });
  },

  async fetchHistory({ reset = false, showLoading = true, fromPullDown = false } = {}) {
    if (this.data.loading || this.data.loadingMore) return;
    if (!reset && !this.data.hasMore) return;

    const nextPage = reset ? 1 : this.data.page + 1;
    this.setData({
      loadFailed: false,
      loadErrorMessage: '',
      ...(showLoading ? { loading: true } : {}),
      ...(!showLoading ? { loadingMore: !reset } : {})
    });

    try {
      const data = await getPhotoHistory(nextPage, this.data.pageSize, { dedupeKey: `history-${nextPage}` });
      const incomingList = this.applyLocalMutations((data.list || []).map(normalizeRecord));
      incomingList.forEach((item) => logImageUrlRisk('previewUrl', item.previewUrl, item.id));

      const mergedList = reset ? incomingList : this.data.list.concat(incomingList);
      const total = Number(data.total || mergedList.length || 0);
      const hasMore = incomingList.length >= this.data.pageSize && mergedList.length < total;
      this.syncSelection(mergedList, reset ? [] : this.data.selectedIds);
      this.setData({
        loadFailed: false,
        loadErrorMessage: '',
        total,
        page: Number(data.page || nextPage),
        pageSize: Number(data.pageSize || this.data.pageSize),
        hasMore
      });
      setCache(HISTORY_CACHE_KEY, {
        list: mergedList,
        total,
        page: Number(data.page || nextPage),
        hasMore
      }, HISTORY_CACHE_TTL);
    } catch (error) {
      if (reset) {
        this.setData({
          list: [],
          selectedIds: [],
          checkAll: false
        });
      }
      this.setData({
        loadFailed: true,
        loadErrorMessage: error.message || '历史记录加载失败'
      });
      wx.showToast({ title: '历史记录加载失败', icon: 'none' });
    } finally {
      this.setData({
        loading: false,
        loadingMore: false
      });
      if (fromPullDown) wx.stopPullDownRefresh();
    }
  },

  toggleManageMode() {
    const manageMode = !this.data.manageMode;
    const list = this.data.list.map((item) => ({ ...item, selected: false }));
    this.setData({
      manageMode,
      list,
      selectedIds: [],
      checkAll: false,
      editingItem: null
    });
  },

  handleCardTap(event) {
    const { record, candidate } = event.detail;
    if (!record || !record.id) return;

    if (this.data.manageMode) {
      this.toggleSelectById(record.id);
      return;
    }

    const candidateQuery = candidate && candidate.candidateId
      ? `&candidateId=${encodeURIComponent(candidate.candidateId)}`
      : '';
    wx.navigateTo({ url: `/pages/history-detail/history-detail?taskId=${record.taskId}${candidateQuery}` });
  },

  toggleSelectById(id) {
    const selectedIds = this.data.selectedIds.includes(id)
      ? this.data.selectedIds.filter((item) => item !== id)
      : [...this.data.selectedIds, id];
    this.syncSelection(this.data.list, selectedIds);
  },

  handleToggleSelect(event) {
    const { id } = event.detail;
    if (!id) return;
    this.toggleSelectById(id);
  },

  handleToggleAll() {
    if (this.data.checkAll) {
      this.syncSelection(this.data.list, []);
      return;
    }
    const selectedIds = this.data.list.map((item) => item.id);
    this.syncSelection(this.data.list, selectedIds);
  },

  openEdit(event) {
    const { record } = event.detail;
    if (!record) return;

    this.setData({
      editingItem: record,
      editForm: {
        name: record.name,
        size: record.size,
        background: record.background
      }
    });
  },

  closeEdit() {
    if (this.data.submitting) return;
    this.setData({
      editingItem: null,
      editForm: {
        name: '',
        size: '',
        background: ''
      }
    });
  },

  handleEditInput(event) {
    const { field } = event.currentTarget.dataset;
    if (!field) return;
    this.setData({
      [`editForm.${field}`]: event.detail.value
    });
  },

  async submitEdit() {
    if (this.data.submitting) return;
    const { editingItem, editForm, list } = this.data;
    if (!editingItem) return;

    const payload = {
      name: (editForm.name || '').trim(),
      size: (editForm.size || '').trim(),
      background: (editForm.background || '').trim()
    };

    if (!payload.name || !payload.size || !payload.background) {
      wx.showToast({ title: '请完整填写编辑信息', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '保存中', mask: true });

    try {
      await Promise.resolve();
      const editMap = this.getEditedMap();
      editMap[editingItem.id] = payload;
      this.saveEditedMap(editMap);

      const index = list.findIndex((item) => item.id === editingItem.id);
      if (index >= 0) {
        this.setData({
          [`list[${index}].name`]: payload.name,
          [`list[${index}].sceneName`]: payload.name,
          [`list[${index}].size`]: payload.size,
          [`list[${index}].sizeText`]: payload.size,
          [`list[${index}].background`]: payload.background,
          [`list[${index}].backgroundColor`]: payload.background
        });
      }

      this.setData({
        editingItem: null,
        editForm: {
          name: '',
          size: '',
          background: ''
        }
      });
      this.shouldRefresh = true;
      wx.showToast({ title: '编辑成功', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '编辑失败，请稍后重试', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ submitting: false });
    }
  },

  confirmDelete(event) {
    const { record } = event.detail;
    if (!record || !record.id || this.data.deleting) return;

    wx.showModal({
      title: '删除确认',
      content: '确认删除这条历史记录吗？删除后不可恢复',
      confirmColor: '#ef4444',
      success: async (res) => {
        if (!res.confirm) return;
        await this.deleteRecords([record.id]);
      }
    });
  },

  confirmBatchDelete() {
    if (this.data.deleting) return;
    const count = this.data.selectedIds.length;
    if (!count) {
      wx.showToast({ title: '请先选择记录', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '删除确认',
      content: `确认删除已选中的 ${count} 条记录吗？删除后不可恢复`,
      confirmColor: '#ef4444',
      success: async (res) => {
        if (!res.confirm) return;
        await this.deleteRecords(this.data.selectedIds);
      }
    });
  },

  async deleteRecords(ids = []) {
    if (!ids.length || this.data.deleting) return;

    this.setData({ deleting: true });
    wx.showLoading({ title: '删除中', mask: true });
    try {
      await Promise.resolve();
      const deletedIds = Array.from(new Set([...this.getDeletedIds(), ...ids]));
      const editMap = this.getEditedMap();
      ids.forEach((id) => {
        delete editMap[id];
      });
      this.saveDeletedIds(deletedIds);
      this.saveEditedMap(editMap);

      const nextList = this.data.list.filter((item) => !ids.includes(item.id));
      const nextSelectedIds = this.data.selectedIds.filter((id) => !ids.includes(id));
      const shouldExitManageMode = this.data.manageMode && !nextList.length;

      this.setData({
        manageMode: shouldExitManageMode ? false : this.data.manageMode,
        editingItem: null,
        total: Math.max(0, this.data.total - ids.length)
      });
      this.syncSelection(nextList, nextSelectedIds);
      this.shouldRefresh = true;
      wx.showToast({ title: '删除成功', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '删除失败，请稍后重试', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ deleting: false });
    }
  },

  noop() {},

  goCreate() {
    wx.switchTab({ url: '/pages/home/home' });
  }
});
