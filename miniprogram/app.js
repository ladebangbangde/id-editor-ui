App({
  globalData: {
    apiBaseUrl: 'http://localhost:3000/api',
    demoUserId: 'u_demo_001',
    themeColor: '#2D6BFF',
    appName: 'AI ID Photo Mini Program'
  },

  onLaunch() {
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);
  }
});
