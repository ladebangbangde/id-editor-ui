const { healthCheck, getMe, wxLogin } = require('./utils/api');

const AUTH_TOKEN_STORAGE_KEY = 'auth_token';
const AUTH_ME_STORAGE_KEY = 'auth_me';
const AUTH_STORAGE_KEYS = [
  AUTH_TOKEN_STORAGE_KEY,
  'accessToken',
  'token',
  'refreshToken',
  AUTH_ME_STORAGE_KEY,
  'userInfo',
  'currentUser',
  'loginExpired',
  'authCache',
  'sessionCache'
];
const AUTH_EXPIRED_BUSINESS_CODE = 9003;

function wxMiniLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        console.info('[auth] wx.login success response:', res);
        resolve(res);
      },
      fail(error) {
        console.error('[auth] wx.login failed:', error);
        reject(error);
      }
    });
  });
}

function normalizeUser(user = {}) {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const nickname = user.nickname || user.nickName || user.name || user.username || '微信用户';
  const avatarUrl = user.avatarUrl || user.avatar_url || user.avatar || user.headImgUrl || '';
  const gender = typeof user.gender === 'number'
    ? user.gender
    : Number(user.gender || 0);

  return {
    ...user,
    nickname,
    avatarUrl,
    gender: Number.isFinite(gender) ? gender : 0
  };
}

function isTokenExpiredText(message = '') {
  return /token\s*已过期/i.test(String(message || ''));
}

App({
  globalData: {
    apiHost: 'https://photo.ldbbd.com',
    apiBaseUrl: 'https://photo.ldbbd.com/api',
    authToken: '',
    adminToken: '',
    demoUserId: 'u_demo_001',
    appName: '棒棒证件照生成',
    me: null,
    authLoading: false,
    authReady: false,
    authError: '',
    authStatus: 'idle'
  },

  onLaunch() {
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);
    this.bootstrapPromise = this.bootstrap();
  },

  emitAuthStateChange() {
    const listeners = Array.isArray(this.authListeners) ? this.authListeners : [];
    listeners.forEach((listener) => {
      try {
        listener(this.globalData);
      } catch (error) {
        console.warn('auth state listener failed', error);
      }
    });
  },

  subscribeAuthState(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }

    if (!Array.isArray(this.authListeners)) {
      this.authListeners = [];
    }

    this.authListeners.push(listener);

    return () => {
      this.authListeners = (this.authListeners || []).filter((item) => item !== listener);
    };
  },

  setAuthState(patch = {}) {
    this.globalData = {
      ...this.globalData,
      ...patch
    };
    this.emitAuthStateChange();
  },

  getAccessToken() {
    const runtimeToken = this.globalData.authToken || '';
    if (runtimeToken) {
      return runtimeToken;
    }
    return wx.getStorageSync(AUTH_TOKEN_STORAGE_KEY) || '';
  },

  setAccessToken(token = '') {
    const nextToken = token || '';
    this.setAuthState({ authToken: nextToken });

    if (nextToken) {
      wx.setStorageSync(AUTH_TOKEN_STORAGE_KEY, nextToken);
    } else {
      wx.removeStorageSync(AUTH_TOKEN_STORAGE_KEY);
      wx.removeStorageSync('accessToken');
      wx.removeStorageSync('token');
    }
  },

  clearAuthStorage() {
    AUTH_STORAGE_KEYS.forEach((key) => wx.removeStorageSync(key));
  },

  resetUserState() {
    this.setAuthState({
      authToken: '',
      me: null,
      authError: '',
      authStatus: 'anonymous'
    });
  },

  restoreAuthState() {
    const token = this.getAccessToken();
    const me = normalizeUser(wx.getStorageSync(AUTH_ME_STORAGE_KEY));

    this.setAuthState({
      authToken: token,
      me,
      authReady: false,
      authError: '',
      authStatus: token ? 'restoring' : 'anonymous'
    });

    return { token, me };
  },

  persistAuthState({ token = '', me = null } = {}) {
    const normalizedMe = normalizeUser(me);
    this.setAccessToken(token || '');

    this.setAuthState({
      me: normalizedMe,
      authReady: true,
      authError: '',
      authStatus: token ? 'authenticated' : 'anonymous'
    });

    if (normalizedMe) {
      wx.setStorageSync(AUTH_ME_STORAGE_KEY, normalizedMe);
    } else {
      wx.removeStorageSync(AUTH_ME_STORAGE_KEY);
      wx.removeStorageSync('userInfo');
      wx.removeStorageSync('currentUser');
    }
  },

  clearAuthState(options = {}) {
    const { keepError = false } = options;
    this.clearAuthStorage();
    this.resetUserState();
    this.setAuthState({
      authReady: true,
      authLoading: false,
      authError: keepError ? this.globalData.authError : ''
    });
  },

  isUnauthorizedError(error = {}) {
    if (!error || typeof error !== 'object') return false;
    const statusCode = Number(error.statusCode || error.code || 0);
    const businessCode = Number(error.businessCode || error.bizCode || error.code || 0);
    const message = error.message || error.msg || '';

    return statusCode === 401
      || businessCode === AUTH_EXPIRED_BUSINESS_CODE
      || error.isAuthError
      || isTokenExpiredText(message);
  },

  async bootstrap() {
    this.restoreAuthState();

    const healthPromise = healthCheck().catch((error) => {
      console.warn('healthCheck failed', error);
      return null;
    });

    try {
      await this.syncLoginStatus();
    } catch (error) {
      console.warn('bootstrap auth failed', error);
    }

    await healthPromise;
  },

  async ensureLogin(options = {}) {
    const { force = false, profile = {} } = options;

    if (this.loginPromise && !force) {
      return this.loginPromise;
    }

    if (force) {
      this.loginPromise = null;
    }

    this.loginPromise = this.loginFlow({ profile })
      .finally(() => {
        // 登录单飞锁必须在 finally 释放，避免失败后永久阻塞。
        this.loginPromise = null;
      });

    return this.loginPromise;
  },

  async loginFlow(options = {}) {
    const { profile = {} } = options;
    console.info('[auth] relogin start');

    try {
      const loginRes = await wxMiniLogin();
      const code = loginRes && loginRes.code;
      if (!code) {
        throw new Error('微信登录失败，请重试');
      }

      const wxLoginPayload = {
        code,
        nickname: profile.nickname || profile.nickName || '',
        avatarUrl: profile.avatarUrl || '',
        gender: typeof profile.gender === 'undefined' ? 0 : Number(profile.gender || 0)
      };

      const authPayload = await wxLogin(wxLoginPayload);
      const token = authPayload.token || authPayload.authToken || authPayload.accessToken || '';

      if (!token) {
        throw new Error('登录成功但未获取到凭证');
      }

      this.setAccessToken(token);
      console.info('[auth] relogin success');
      return token;
    } catch (error) {
      console.warn('[auth] relogin failed', error);
      throw error;
    }
  },

  async fetchMeAndPersist() {
    const me = normalizeUser(await getMe());
    this.persistAuthState({
      token: this.getAccessToken(),
      me
    });
    console.info('[auth] auth/me success', {
      userId: (me && (me.userId || me.id || me.openId || '')) || ''
    });
    return me;
  },

  async syncLoginStatus() {
    if (this.syncLoginPromise) {
      return this.syncLoginPromise;
    }

    this.syncLoginPromise = (async () => {
      console.info('[auth] sync login start');
      this.setAuthState({
        authLoading: true,
        authReady: false,
        authError: '',
        authStatus: 'loading'
      });

      let hasRetried = false;

      try {
        let token = this.getAccessToken();

        while (true) {
          if (!token) {
            await this.ensureLogin({ force: hasRetried });
            token = this.getAccessToken();
          }

          try {
            return await this.fetchMeAndPersist();
          } catch (error) {
            if (!this.isUnauthorizedError(error) || hasRetried) {
              throw error;
            }

            console.warn('[auth] auth/me unauthorized', {
              statusCode: error.statusCode || 0,
              businessCode: error.businessCode || error.code || 0,
              message: error.message || ''
            });

            hasRetried = true;
            this.clearAuthStorage();
            this.resetUserState();
            token = '';
          }
        }
      } catch (error) {
        this.clearAuthStorage();
        this.resetUserState();
        this.setAuthState({
          authError: error.message || '登录已失效，请重新进入页面',
          authStatus: 'anonymous'
        });
        throw error;
      } finally {
        // 启动同步态必须在 finally 收口，避免页面“正在同步登录状态”卡死。
        this.setAuthState({
          authLoading: false,
          authReady: true,
          authStatus: this.globalData.authToken ? 'authenticated' : 'anonymous'
        });
        console.info('[auth] sync login finished', {
          status: this.globalData.authStatus,
          hasToken: Boolean(this.globalData.authToken)
        });
      }
    })().finally(() => {
      this.syncLoginPromise = null;
    });

    return this.syncLoginPromise;
  },

  async handleUnauthorized(error = {}) {
    if (!this.isUnauthorizedError(error)) {
      return Promise.reject(error);
    }

    if (this.reloginPromise) {
      return this.reloginPromise;
    }

    this.reloginPromise = this.syncLoginStatus()
      .catch((reloginError) => {
        console.warn('[auth] handleUnauthorized relogin failed', reloginError);
        return null;
      })
      .finally(() => {
        this.reloginPromise = null;
      });

    return this.reloginPromise;
  },

  async loginWithWechat(profile = {}) {
    this.clearAuthStorage();
    this.resetUserState();
    await this.ensureLogin({ force: true, profile });
    return this.syncLoginStatus();
  },

  async logout() {
    this.clearAuthStorage();
    this.resetUserState();
    this.setAuthState({
      authLoading: false,
      authReady: true,
      authStatus: 'anonymous'
    });
    return Promise.resolve();
  }
});
