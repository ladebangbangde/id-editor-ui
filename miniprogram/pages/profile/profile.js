const { adminLogin, getAdminStats } = require('../../utils/api');

Page({
  goHistory() {
    wx.switchTab({ url: '/pages/history/history' });
  },

  goFaq() {
    wx.navigateTo({ url: '/pages/faq/faq' });
  },

  async tapItem() {
    const app = getApp();
    try {
      if (!app.globalData.adminToken) {
        const data = await adminLogin();
        app.globalData.adminToken = data.token || 'demo-token';
      }
      await getAdminStats(app.globalData.adminToken);
      wx.showToast({ title: '接口已连通', icon: 'none' });
    } catch (error) {
      wx.showToast({ title: '功能建设中', icon: 'none' });
    }
  }
});
