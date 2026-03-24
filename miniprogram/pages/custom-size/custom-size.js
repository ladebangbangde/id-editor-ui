const { getFlowDraft, setFlowDraft } = require('../../utils/flow-draft');
const storage = require('../../utils/storage');
const { CANONICAL_SIZE_OPTIONS, buildSceneBySizeCode } = require('../../utils/size-codes');

const RECENT_SIZE_KEY = 'recent_size_codes';

function normalizeTemplate(item = {}) {
  return {
    ...item,
    code: item.sizeCode,
    name: item.label,
    sizeText: `${item.widthMm || '--'}×${item.heightMm || '--'}mm`,
    pixelText: `${item.pixelWidth || '--'}×${item.pixelHeight || '--'}px`
  };
}

Page({
  data: {
    keyword: '',
    allSizes: [],
    hotSizes: [],
    recentSizes: [],
    filteredSizes: [],
    selectedSizeCode: '',
    customMode: false,
    widthMm: '',
    heightMm: ''
  },

  onLoad() {
    const allSizes = CANONICAL_SIZE_OPTIONS.map(normalizeTemplate);
    const draft = getFlowDraft();
    const selectedSizeCode = draft.selectedSizeCode || (draft.selectedScene && draft.selectedScene.sceneKey) || '';
    const recentCodes = storage.get(RECENT_SIZE_KEY, []);
    const recentSizes = allSizes.filter((item) => recentCodes.includes(item.code)).slice(0, 4);
    this.setData({
      allSizes,
      hotSizes: allSizes.filter((item) => item.featured).slice(0, 6),
      recentSizes,
      selectedSizeCode,
      filteredSizes: allSizes
    });
  },

  handleKeywordInput(event) {
    const keyword = (event.detail.value || '').trim();
    const filteredSizes = this.data.allSizes.filter((item) => {
      const text = `${item.name} ${item.code} ${item.sizeText}`.toLowerCase();
      return text.includes(keyword.toLowerCase());
    });
    this.setData({ keyword, filteredSizes });
  },

  handleSelectSize(event) {
    const { code } = event.currentTarget.dataset;
    if (!code) return;
    this.setData({ selectedSizeCode: code, customMode: false });
  },

  toggleCustomMode() {
    this.setData({ customMode: !this.data.customMode });
  },

  onWidthInput(e) {
    this.setData({ widthMm: e.detail.value.trim() });
  },

  onHeightInput(e) {
    this.setData({ heightMm: e.detail.value.trim() });
  },

  saveRecent(code) {
    const oldList = storage.get(RECENT_SIZE_KEY, []);
    const next = [code, ...oldList.filter((item) => item !== code)].slice(0, 8);
    storage.set(RECENT_SIZE_KEY, next);
  },

  nextStep() {
    if (this.data.customMode) {
      const width = Number(this.data.widthMm);
      const height = Number(this.data.heightMm);
      if (!width || !height) {
        wx.showToast({ title: '请输入自定义尺寸', icon: 'none' });
        return;
      }
      const customScene = {
        sceneKey: 'custom',
        sceneName: '自定义尺寸',
        widthMm: width,
        heightMm: height,
        pixelWidth: Math.round(width * 11.8),
        pixelHeight: Math.round(height * 11.8)
      };
      setFlowDraft({
        flowMode: 'free',
        needSelectSize: false,
        selectedScene: customScene,
        selectedSizeCode: 'custom',
        customSize: { widthMm: width, heightMm: height }
      });
      wx.navigateTo({ url: '/pages/editor/editor' });
      return;
    }

    if (!this.data.selectedSizeCode) {
      wx.showToast({ title: '请先选择尺寸', icon: 'none' });
      return;
    }

    const selectedScene = buildSceneBySizeCode(this.data.selectedSizeCode);
    this.saveRecent(this.data.selectedSizeCode);
    setFlowDraft({
      needSelectSize: false,
      selectedScene: selectedScene || null,
      selectedSizeCode: this.data.selectedSizeCode,
      customSize: null
    });
    wx.navigateTo({ url: '/pages/editor/editor' });
  }
});
