const { STORAGE_KEYS, SCENE_TEMPLATES } = require('../../utils/constants');
const storage = require('../../utils/storage');

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

function resolveSceneInfo(options = {}, currentScene = null) {
  if (currentScene && currentScene.scene) {
    return currentScene.scene;
  }

  if (!options.sceneKey) {
    return null;
  }

  const matched = SCENE_TEMPLATES.find((item) => item.sceneKey === options.sceneKey);
  if (matched) {
    return matched;
  }

  return {
    sceneKey: options.sceneKey,
    sceneName: options.sceneName ? decodeURIComponent(options.sceneName) : '证件照',
    widthMm: Number(options.widthMm || 0),
    heightMm: Number(options.heightMm || 0),
    pixelWidth: Number(options.pixelWidth || 0),
    pixelHeight: Number(options.pixelHeight || 0),
    description: options.description ? decodeURIComponent(options.description) : ''
  };
}

Page({
  data: {
    sceneInfo: null,
    imagePath: ''
  },

  onLoad(options) {
    const current = storage.get(STORAGE_KEYS.CURRENT_SCENE, null);
    const sceneInfo = resolveSceneInfo(options, current);
    this.setData({ sceneInfo });

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
        if (!file.tempFilePath) {
          wx.showToast({ title: '未获取到图片，请重试', icon: 'none' });
          return;
        }
        if (file.size && file.size > MAX_IMAGE_SIZE) {
          wx.showToast({ title: '图片过大，请选择 15MB 内图片', icon: 'none' });
          return;
        }

        this.setData({ imagePath: file.tempFilePath });
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
    storage.remove(STORAGE_KEYS.CURRENT_RESULT);
    wx.navigateTo({ url: '/pages/editor/editor' });
  }
});
