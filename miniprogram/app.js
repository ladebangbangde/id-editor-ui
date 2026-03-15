App({
  globalData: {
    apiBaseUrl: 'http://localhost:3000/api',
    demoUserId: 'u_demo_001',
    appName: 'AI证件照制作'
  },
  onLaunch() {
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);
  }
});
