const storage = require('./utils/storage');
const { getHealth, getMe } = require('./utils/api');

App({
  globalData: {
    serverBaseUrl: 'http://127.0.0.1:30000',
    apiBaseUrl: 'http://127.0.0.1:30000/api',
    demoUserId: 'u_demo_001',
    themeColor: '#2D6BFF',
    appName: 'AI ID Photo Mini Program',
    healthStatus: 'unknown',
    currentUser: null
  },

  onLaunch() {
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);
    this.bootstrapRuntime();
  },

  async bootstrapRuntime() {
    try {
      const healthRes = await getHealth();
      this.globalData.healthStatus = (healthRes && healthRes.status) || 'ok';
    } catch (error) {
      this.globalData.healthStatus = 'error';
    }

    try {
      const meRes = await getMe();
      const user = (meRes && meRes.data) || null;
      if (user) {
        this.globalData.currentUser = user;
        this.globalData.demoUserId = user.userId || user.id || this.globalData.demoUserId;
        storage.setUserProfile({
          nickname: user.nickname || user.name || 'Demo User',
          avatarUrl: user.avatarUrl || ''
        });
      }
    } catch (error) {
      // keep default mock user when /auth/me is unavailable
    }
  }
});
