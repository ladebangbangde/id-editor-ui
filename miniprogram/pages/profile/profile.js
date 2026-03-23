const { adminLogin, getAdminStats } = require('../../utils/api');

function buildProfileState(app) {
  const me = (app && app.globalData && app.globalData.me) || {};
  const authToken = (app && app.globalData && app.globalData.authToken) || '';
  const authLoading = Boolean(app && app.globalData && app.globalData.authLoading);
  const loginError = (app && app.globalData && app.globalData.authError) || '';
  const nickname = me.nickname || me.nickName || me.name || '微信用户';
  const avatarUrl = me.avatarUrl || me.avatar || '';
  const avatarText = nickname ? nickname.slice(0, 1) : '用';

  return {
    isLoggedIn: Boolean(authToken),
    authLoading,
    loginError,
    nickname,
    avatarUrl,
    avatarText,
    welcomeText: authToken
      ? '欢迎回来'
      : '登录后可同步你的作品与记录'
  };
}

function getWechatProfile() {
  if (typeof wx.getUserProfile !== 'function') {
    return Promise.resolve({});
  }

  return new Promise((resolve) => {
    wx.getUserProfile({
      desc: '用于完善头像与昵称',
      success(res) {
        resolve(res.userInfo || {});
      },
      fail() {
        resolve({});
      }
    });
  });
}

Page({
  data: {
    isLoggedIn: false,
    authLoading: true,
    loginError: '',
    nickname: '微信用户',
    avatarUrl: '',
    avatarText: '用',
    welcomeText: '登录中...'
  },

  onShow() {
    this.syncProfileState();
  },

  syncProfileState() {
    this.setData(buildProfileState(getApp()));
  },

  goHistory() {
    wx.switchTab({ url: '/pages/history/history' });
  },

  goFaq() {
    wx.navigateTo({ url: '/pages/faq/faq' });
  },

  async handleLoginTap() {
    const app = getApp();
    this.setData({ authLoading: true, loginError: '' });

    const profile = await getWechatProfile();

    try {
      await app.loginWithWechat(profile);
      wx.showToast({ title: '登录成功', icon: 'none' });
    } catch (error) {
      wx.showToast({ title: error.message || '登录失败', icon: 'none' });
    } finally {
      this.syncProfileState();
    }
  },

  async handleRefreshLogin() {
    const app = getApp();
    this.setData({ authLoading: true, loginError: '' });

    try {
      await app.ensureLogin({ force: true });
      wx.showToast({ title: '登录状态已刷新', icon: 'none' });
    } catch (error) {
      wx.showToast({ title: error.message || '刷新失败', icon: 'none' });
    } finally {
      this.syncProfileState();
    }
  },

  async handleLogoutTap() {
    const app = getApp();
    await app.logout();
    this.syncProfileState();
    wx.showToast({ title: '已退出登录', icon: 'none' });
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
