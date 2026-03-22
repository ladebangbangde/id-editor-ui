const { getFriendlySceneName, getFriendlySceneHint } = require('../../utils/photo-display');

Component({
  properties: {
    info: { type: Object, value: {} },
    colorLabel: { type: String, value: '白色' }
  },
  data: {
    displayName: '证件照',
    displayHint: ''
  },
  observers: {
    info(value) {
      this.setData({
        displayName: getFriendlySceneName(value || {}, '证件照'),
        displayHint: getFriendlySceneHint(value || {}) || (value && value.description) || '适合常见证件照使用场景'
      });
    }
  }
});
