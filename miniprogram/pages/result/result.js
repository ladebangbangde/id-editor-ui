const { STORAGE_KEYS, MOCK_RESULT } = require('../../utils/constants');
const storage = require('../../utils/storage');

Page({
  data: {
    result: null
  },

  onShow() {
    const result = storage.get(STORAGE_KEYS.CURRENT_RESULT, null) || MOCK_RESULT;
    this.setData({ result });
  },

  savePreview() {
    wx.showToast({ title: '预览图已保存', icon: 'none' });
  },

  downloadHd() {
    wx.showToast({ title: '高清下载功能待接入支付', icon: 'none' });
  },

  downloadLayout() {
    wx.showToast({ title: '排版下载功能开发中', icon: 'none' });
  },

  remake() {
    wx.redirectTo({ url: '/pages/upload/upload' });
  }
});
