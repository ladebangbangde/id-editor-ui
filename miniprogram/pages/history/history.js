const { getPhotoHistory } = require('../../utils/api');
const { formatTime, getColorLabel } = require('../../utils/format');
const { pickBestImageUrl: pickImageFromCandidates, cleanUrl, isLikelyLocalPath } = require('../../utils/image-url');
const { getFriendlySceneName, getFriendlySizeText, pickBestImageUrl } = require('../../utils/photo-display');

function buildStatus(item = {}) {
  if (item.status) return item.status;
  if (item.qualityStatus === 'PASSED' || item.qualityStatus === 'WARNING') {
    return 'success';
  }
  if (item.qualityStatus === 'FAILED') {
    return 'failed';
  }
  return 'processing';
}

const EDIT_STORAGE_KEY = 'history_edit_map';
const DELETE_STORAGE_KEY = 'history_deleted_ids';

function normalizeRecord(item = {}) {
  const id = item.taskId || item.imageId || item.id;
  const warnings = Array.isArray(item.warnings) ? item.warnings : [];
  const backgroundColor = item.backgroundColorLabel
    || (item.backgroundColor ? getColorLabel(item.backgroundColor) : '')
    || item.backgroundColor
    || '--';
  const friendlyName = getFriendlySceneName(item, '证件照');
  const friendlySizeText = getFriendlySizeText(item);
  const previewUrl = pickImageFromCandidates([
    item.previewUrl,
    item.preview_url,
    item.result && item.result.previewUrl,
    item.result && item.result.preview_url,
    item.resultUrl,
    item.result_url,
    item.hdUrl,
    item.hd_url,
    item.originalUrl,
    item.original_url
  ]);
  const displayUrl = pickImageFromCandidates([
    item.displayUrl,
    previewUrl,
    pickBestImageUrl(item)
  ]);
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
    imageUrl: displayUrl,
    previewUrl,
    displayUrl,
    resultUrl: item.resultUrl || '',
    createdAt: formatTime(item.createdAt),
    status: buildStatus(item),
    qualityStatus: item.qualityStatus || '',
    qualityMessage: item.qualityMessage || '',
    warnings,
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
    pageSize: 20,
    total: 0,
    manageMode: false,
    selectedIds: [],
    checkAll: false,
    editingItem: null,
    editForm: {
      name: '',
      size: '',
      background: ''
    },
    submitting: false
  },

  onShow() {
    this.fetchHistory();
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

  async fetchHistory(showLoading = true) {
    const { page, pageSize } = this.data;
    if (showLoading) {
      this.setData({ loading: true, loadFailed: false, loadErrorMessage: '' });
    }

    try {
      const data = await getPhotoHistory(page, pageSize);
      console.log('[history] normalized history payload', data);
      const list = this.applyLocalMutations((data.list || []).map(normalizeRecord));
      console.log('[history] final record image bindings', list.map((item) => ({
        id: item.id,
        previewUrl: item.previewUrl,
        displayUrl: item.displayUrl
      })));
      list.forEach((item) => {
        logImageUrlRisk('previewUrl', item.previewUrl, item.id);
      });
      this.syncSelection(list, this.data.selectedIds);
      this.setData({
        loadFailed: false,
        loadErrorMessage: '',
        total: Number(data.total || list.length || 0),
        page: Number(data.page || page || 1),
        pageSize: Number(data.pageSize || pageSize || 20)
      });
    } catch (error) {
      this.setData({
        list: [],
        selectedIds: [],
        checkAll: false,
        loadFailed: true,
        loadErrorMessage: error.message || '历史记录加载失败'
      });
      wx.showToast({ title: '历史记录加载失败', icon: 'none' });
    } finally {
      if (showLoading) {
        this.setData({ loading: false });
      }
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
    const { record } = event.detail;
    if (!record || !record.id) return;

    if (this.data.manageMode) {
      this.toggleSelectById(record.id);
      return;
    }

    wx.navigateTo({ url: `/pages/history-detail/history-detail?taskId=${record.taskId}` });
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

      const nextList = list.map((item) => {
        if (item.id !== editingItem.id) return item;
        return {
          ...item,
          ...payload,
          sceneName: payload.name,
          sizeText: payload.size,
          backgroundColor: payload.background
        };
      });

      this.setData({
        list: nextList,
        editingItem: null,
        editForm: {
          name: '',
          size: '',
          background: ''
        }
      });
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
    if (!record || !record.id) return;

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
    if (!ids.length) return;

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
        editingItem: null
      });
      this.syncSelection(nextList, nextSelectedIds);
      wx.showToast({ title: '删除成功', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '删除失败，请稍后重试', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  noop() {},

  goCreate() {
    wx.switchTab({ url: '/pages/home/home' });
  }
});
