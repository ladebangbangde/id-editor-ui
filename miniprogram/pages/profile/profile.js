const { adminLogin, getAdminStats } = require('../../utils/api');

function buildProfileState(app) {
  const globalData = (app && app.globalData) || {};
  const me = globalData.me || {};
  const authToken = globalData.authToken || '';
  const authLoading = Boolean(globalData.authLoading);
  const authReady = Boolean(globalData.authReady);
  const authStatus = globalData.authStatus || (authLoading ? 'loading' : (authToken ? 'authenticated' : 'anonymous'));
  const loginError = globalData.authError || '';
  const nickname = me.nickname || me.nickName || me.name || '微信用户';
  const avatarUrl = me.avatarUrl || me.avatar || '';
  const avatarText = nickname ? nickname.slice(0, 1) : '用';
  const hasMe = Boolean(me && typeof me === 'object' && Object.keys(me).length);
  const isLoggedIn = Boolean(authToken || hasMe);
  const isAuthenticatedState = authStatus === 'authenticated';
  const hasStableLogin = isLoggedIn && (isAuthenticatedState || authReady);
  const isLoginPending = !hasStableLogin && (authLoading || !authReady || authStatus === 'loading' || authStatus === 'restoring');

  return {
    authStatus: isLoginPending ? 'loading' : (isLoggedIn ? 'authenticated' : 'anonymous'),
    isLoggedIn,
    authLoading: isLoginPending,
    loginError,
    nickname,
    avatarUrl,
    avatarText,
    welcomeText: isLoginPending
      ? '正在同步登录状态，请稍候'
      : (isLoggedIn ? '欢迎回来，继续制作你的证件照' : '登录后可同步你的作品与记录'),
    statusText: isLoginPending ? '登录中' : (isLoggedIn ? '已登录' : '未登录'),
    loginActionText: loginError ? '重新登录' : '微信登录',
    statusBadgeClass: isLoggedIn ? 'login-badge-success' : (isLoginPending ? 'login-badge-pending' : 'login-badge-default'),
    showRetry: !isLoggedIn && !isLoginPending,
    showLogout: isLoggedIn && !isLoginPending
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
    authStatus: 'loading',
    isLoggedIn: false,
    authLoading: true,
    loginError: '',
    nickname: '微信用户',
    avatarUrl: '',
    avatarText: '用',
    welcomeText: '登录中...',
    statusText: '登录中',
    loginActionText: '微信登录',
    statusBadgeClass: 'login-badge-pending',
    showRetry: false,
    showLogout: false
  },

  onLoad() {
    const app = getApp();
    if (app && typeof app.subscribeAuthState === 'function') {
      this.unsubscribeAuthState = app.subscribeAuthState(() => {
        this.syncProfileState();
      });
    }
  },

  onShow() {
    try {
      this.syncProfileState();
    } catch (error) {
      console.error('[profile] onShow fallback', error);
      this.setData({
        authStatus: 'anonymous',
        isLoggedIn: false,
        authLoading: false,
        loginError: '',
        nickname: '微信用户',
        avatarUrl: '',
        avatarText: '用',
        welcomeText: '欢迎使用，登录后可同步作品与记录',
        statusText: '未登录',
        loginActionText: '微信登录',
        statusBadgeClass: 'login-badge-default',
        showRetry: true,
        showLogout: false
      });
    }
  },

  onUnload() {
    if (typeof this.unsubscribeAuthState === 'function') {
      this.unsubscribeAuthState();
      this.unsubscribeAuthState = null;
    }
  },

  syncProfileState() {
    const profileState = buildProfileState(getApp());
    console.info('[profile] syncProfileState', {
      authToken: (getApp() && getApp().globalData && getApp().globalData.authToken) || '',
      authLoading: profileState.authLoading,
      authReady: Boolean(getApp() && getApp().globalData && getApp().globalData.authReady),
      authStatus: profileState.authStatus,
      me: (getApp() && getApp().globalData && getApp().globalData.me) || null
    });
    this.setData(profileState);
  },

  goHistory() {
    wx.switchTab({ url: '/pages/history/history' });
  },

  goFaq() {
    wx.navigateTo({ url: '/pages/faq/faq' });
  },

  async handleLoginTap() {
    const app = getApp();
    this.setData({ authLoading: true, loginError: '', authStatus: 'loading' });

    const profile = await getWechatProfile();

    try {
      await app.loginWithWechat(profile);
      wx.showToast({ title: '登录成功', icon: 'none' });
    } catch (error) {
      wx.showToast({ title: error.message || '登录失败', icon: 'none' });
    } finally {
      console.info('[profile] handleLoginTap(finally)', {
        authToken: app.globalData.authToken || '',
        authLoading: Boolean(app.globalData.authLoading),
        authReady: Boolean(app.globalData.authReady),
        authStatus: app.globalData.authStatus,
        me: app.globalData.me || null
      });
      this.syncProfileState();
    }
  },

  async handleRefreshLogin() {
    const app = getApp();
    this.setData({ authLoading: true, loginError: '', authStatus: 'loading' });

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
