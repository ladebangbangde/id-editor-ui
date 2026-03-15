const { STORAGE_KEYS, SCENE_TEMPLATES } = require('../../utils/constants');
const storage = require('../../utils/storage');

Page({
  data: {
    sceneInfo: null,
    imagePath: ''
  },

  onLoad(options) {
    const current = storage.get(STORAGE_KEYS.CURRENT_SCENE, null);
    if (current && current.scene) {
      this.setData({ sceneInfo: current.scene });
    } else if (options.sceneKey) {
      const scene = SCENE_TEMPLATES.find((i) => i.sceneKey === options.sceneKey);
      this.setData({ sceneInfo: scene || null });
    }

    const uploadData = storage.get(STORAGE_KEYS.CURRENT_UPLOAD, {});
    if (uploadData.imagePath) {
      this.setData({ imagePath: uploadData.imagePath });
    }
  },

  chooseFromCamera() {
    this.pickImage(['camera']);
  },

  chooseFromAlbum() {
    this.pickImage(['album']);
  },

  pickImage(sourceType) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType,
      success: (res) => {
        const file = (res.tempFiles && res.tempFiles[0]) || {};
        this.setData({ imagePath: file.tempFilePath || '' });
      }
    });
  },

  nextStep() {
    if (!this.data.imagePath) {
      wx.showToast({ title: '请先上传照片', icon: 'none' });
      return;
    }

    storage.set(STORAGE_KEYS.CURRENT_UPLOAD, {
      imagePath: this.data.imagePath,
      sceneInfo: this.data.sceneInfo
    });
    wx.navigateTo({ url: '/pages/editor/editor' });
  }
});
