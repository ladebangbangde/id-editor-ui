const { SCENE_TEMPLATES, STORAGE_KEYS } = require('../../utils/constants');
const storage = require('../../utils/storage');

Page({
  data: {
    scenes: SCENE_TEMPLATES
  },

  handleSceneTap(event) {
    const scene = event.detail.item;
    storage.set(STORAGE_KEYS.CURRENT_SCENE, { type: 'fixed', scene });
    wx.navigateTo({ url: `/pages/upload/upload?sceneKey=${scene.sceneKey}` });
  },

  goCustomSize() {
    wx.navigateTo({ url: '/pages/custom-size/custom-size' });
  }
});
