const { healthCheck, getMe } = require('./utils/api');

App({
  globalData: {
    apiHost: 'http://127.0.0.1:30000',
    apiBaseUrl: 'http://127.0.0.1:30000/api',
    authToken: '',
    adminToken: '',
    demoUserId: 'u_demo_001',
    appName: 'AI证件照制作',
    me: null
  },

  onLaunch() {
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);
    this.bootstrap();
  },

  async bootstrap() {
    try {
      await healthCheck();
      const me = await getMe();
      this.globalData.me = me;
    } catch (error) {
      console.warn('bootstrap failed', error);
    }
  }
});
