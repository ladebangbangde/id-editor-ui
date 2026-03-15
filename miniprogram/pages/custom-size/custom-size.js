const { STORAGE_KEYS } = require('../../utils/constants');
const storage = require('../../utils/storage');

Page({
  data: {
    widthMm: '',
    heightMm: '',
    color: 'white'
  },

  onWidthInput(e) {
    this.setData({ widthMm: e.detail.value.trim() });
  },

  onHeightInput(e) {
    this.setData({ heightMm: e.detail.value.trim() });
  },

  onColorChange(e) {
    this.setData({ color: e.detail.value });
  },

  nextStep() {
    const width = Number(this.data.widthMm);
    const height = Number(this.data.heightMm);

    if (!this.data.widthMm || !this.data.heightMm) {
      wx.showToast({ title: '宽度和高度不能为空', icon: 'none' });
      return;
    }
    if (Number.isNaN(width) || Number.isNaN(height) || width <= 0 || height <= 0) {
      wx.showToast({ title: '宽高必须为正数', icon: 'none' });
      return;
    }
    if (width < 10 || width > 120 || height < 10 || height > 160) {
      wx.showToast({ title: '请输入合理范围尺寸', icon: 'none' });
      return;
    }

    const scene = {
      sceneKey: 'custom',
      sceneName: '自定义尺寸',
      widthMm: width,
      heightMm: height,
      pixelWidth: Math.round(width * 11.8),
      pixelHeight: Math.round(height * 11.8),
      description: '按自定义尺寸生成证件照'
    };

    storage.set(STORAGE_KEYS.CURRENT_SCENE, { type: 'custom', scene, color: this.data.color });
    wx.navigateTo({ url: '/pages/upload/upload?from=custom' });
  }
});
