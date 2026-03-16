const { SCENE_TEMPLATES, STORAGE_KEYS } = require('../../utils/constants');
const { getScenes } = require('../../utils/api');
const storage = require('../../utils/storage');

Page({
  data: {
    scenes: SCENE_TEMPLATES,
    loading: false
  },

  onLoad() {
    this.fetchScenes();
  },

  fetchScenes() {
    this.setData({ loading: true });
    getScenes()
      .then((list) => {
        if (Array.isArray(list) && list.length) {
          this.setData({ scenes: list });
        }
      })
      .catch(() => {
        wx.showToast({ title: '场景加载失败，已使用默认模板', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
      });
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
