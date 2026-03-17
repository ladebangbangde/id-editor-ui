const { STORAGE_KEYS, COLOR_OPTIONS, MOCK_RESULT, MOCK_HISTORY } = require('../../utils/constants');
const { getColorLabel, formatTime } = require('../../utils/format');
const storage = require('../../utils/storage');

Page({
  data: {
    sceneInfo: {},
    imagePath: '',
    selectedColor: 'white',
    generating: false
  },

  onLoad() {
    const uploadData = storage.get(STORAGE_KEYS.CURRENT_UPLOAD, {});
    const currentScene = storage.get(STORAGE_KEYS.CURRENT_SCENE, {});
    const sceneInfo = uploadData.sceneInfo || currentScene.scene || {};
    this.setData({
      sceneInfo,
      imagePath: uploadData.imagePath || '',
      selectedColor: currentScene.color || 'white'
    });
  },

  onColorChange(event) {
    this.setData({ selectedColor: event.detail.value });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  handleGenerate() {
    if (!this.data.imagePath) {
      wx.showToast({ title: '请先上传照片', icon: 'none' });
      return;
    }
    this.setData({ generating: true });

    setTimeout(() => {
      const result = {
        ...MOCK_RESULT,
        sceneName: this.data.sceneInfo.sceneName || '自定义尺寸',
        sizeText: `${this.data.sceneInfo.widthMm || '--'}×${this.data.sceneInfo.heightMm || '--'}mm`,
        pixelText: `${this.data.sceneInfo.pixelWidth || '--'}×${this.data.sceneInfo.pixelHeight || '--'}`,
        backgroundColor: getColorLabel(this.data.selectedColor),
        sourceImage: this.data.imagePath,
        createdAt: formatTime(Date.now())
      };
      storage.set(STORAGE_KEYS.CURRENT_RESULT, result);

      const oldList = storage.get(STORAGE_KEYS.HISTORY_LIST, MOCK_HISTORY);
      const newRecord = {
        recordId: `r_${Date.now()}`,
        sceneName: result.sceneName,
        sizeText: result.sizeText,
        backgroundColor: result.backgroundColor,
        previewUrl: result.previewUrl,
        createdAt: result.createdAt,
        status: 'pending'
      };
      storage.set(STORAGE_KEYS.HISTORY_LIST, [newRecord, ...oldList]);
      this.setData({ generating: false });
      wx.navigateTo({ url: '/pages/result/result' });
    }, 900);
  }
});
