const { SCENE_TEMPLATES, STORAGE_KEYS } = require('../../utils/constants');
const { getScenes, getSceneDetail } = require('../../utils/api');
const storage = require('../../utils/storage');

function resolveTappedScene(event, scenes = []) {
  const detailItem = event && event.detail && event.detail.item;
  if (detailItem && detailItem.sceneKey) return detailItem;

  const dataset = event && event.currentTarget && event.currentTarget.dataset;
  const datasetItem = dataset && dataset.item;
  if (datasetItem && datasetItem.sceneKey) return datasetItem;

  const datasetIndex = dataset && dataset.index;
  const index = Number(datasetIndex);
  if (!Number.isNaN(index) && scenes[index] && scenes[index].sceneKey) {
    return scenes[index];
  }

  return null;
}

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

  async handleSceneTap(event) {
    const tappedScene = resolveTappedScene(event, this.data.scenes);

    if (!tappedScene) {
      wx.showToast({ title: '场景数据异常，请重试', icon: 'none' });
      return;
    }

    let scene = tappedScene;

    try {
      const detail = await getSceneDetail(tappedScene.sceneKey);
      if (detail && Object.keys(detail).length) {
        scene = {
          ...tappedScene,
          ...detail
        };
      }
    } catch (error) {
      console.warn('scene detail fetch failed', error);
    }

    storage.set(STORAGE_KEYS.CURRENT_SCENE, { type: 'fixed', scene });
    wx.navigateTo({ url: `/pages/upload/upload?sceneKey=${scene.sceneKey}` });
  },

  goCustomSize() {
    wx.navigateTo({ url: '/pages/custom-size/custom-size' });
  }
});
