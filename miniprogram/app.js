const { healthCheck, getMe, wxLogin } = require('./utils/api');

const AUTH_TOKEN_STORAGE_KEY = 'auth_token';
const AUTH_ME_STORAGE_KEY = 'auth_me';

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

App({
  globalData: {
    apiHost: 'http://127.0.0.1:30000',
    apiBaseUrl: 'http://127.0.0.1:30000/api',
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

  restoreAuthState() {
    const token = wx.getStorageSync(AUTH_TOKEN_STORAGE_KEY) || '';
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
    console.info('[auth] persistAuthState(before)', {
      authToken: token || '',
      authLoading: this.globalData.authLoading,
      authReady: this.globalData.authReady,
      authStatus: this.globalData.authStatus,
      me: normalizedMe
    });

    this.setAuthState({
      authToken: token || '',
      me: normalizedMe,
      authReady: true,
      authError: '',
      authStatus: token ? 'authenticated' : 'anonymous'
    });

    console.info('[auth] persistAuthState(after)', {
      authToken: this.globalData.authToken,
      authLoading: this.globalData.authLoading,
      authReady: this.globalData.authReady,
      authStatus: this.globalData.authStatus,
      me: this.globalData.me
    });

    if (token) {
      wx.setStorageSync(AUTH_TOKEN_STORAGE_KEY, token);
    } else {
      wx.removeStorageSync(AUTH_TOKEN_STORAGE_KEY);
    }

    if (normalizedMe) {
      wx.setStorageSync(AUTH_ME_STORAGE_KEY, normalizedMe);
    } else {
      wx.removeStorageSync(AUTH_ME_STORAGE_KEY);
    }
  },

  clearAuthState(options = {}) {
    const { keepError = false } = options;

    this.setAuthState({
      authToken: '',
      me: null,
      authReady: true,
      authError: keepError ? this.globalData.authError : '',
      authStatus: 'anonymous'
    });

    wx.removeStorageSync(AUTH_TOKEN_STORAGE_KEY);
    wx.removeStorageSync(AUTH_ME_STORAGE_KEY);
  },

  isUnauthorizedError(error = {}) {
    const statusCode = Number(
      error.statusCode
      || error.code
      || (error.data && error.data.code)
      || 0
    );

    return statusCode === 401;
  },

  async bootstrap() {
    this.restoreAuthState();

    const healthPromise = healthCheck().catch((error) => {
      console.warn('healthCheck failed', error);
      return null;
    });

    try {
      await this.ensureLogin({ silent: true });
    } catch (error) {
      console.warn('bootstrap auth failed', error);
    } finally {
      this.setAuthState({
        authReady: true,
        authLoading: false,
        authStatus: this.globalData.authToken ? 'authenticated' : 'anonymous'
      });
    }

    await healthPromise;
  },

  async ensureLogin(options = {}) {
    const { force = false } = options;

    if (this.authPromise && !force) {
      return this.authPromise;
    }

    if (force) {
      this.authPromise = null;
    }

    this.authPromise = this.loginFlow(options)
      .finally(() => {
        this.authPromise = null;
      });

    return this.authPromise;
  },

  async loginFlow(options = {}) {
    const { force = false, profile = {} } = options;

    this.setAuthState({
      authLoading: true,
      authError: '',
      authStatus: 'loading'
    });

    if (!force) {
      this.restoreAuthState();
      this.setAuthState({
        authLoading: true,
        authStatus: 'loading'
      });
    }

    try {
      if (this.globalData.authToken && !force) {
        try {
          const me = normalizeUser(await getMe());
          this.persistAuthState({
            token: this.globalData.authToken,
            me
          });
          return me;
        } catch (error) {
          console.warn('getMe failed, relogin required', error);
          this.clearAuthState({ keepError: true });
        }
      }

      const loginRes = await wxMiniLogin();
      const code = loginRes && loginRes.code;
      console.info('[auth] wx.login raw response before wxLogin:', loginRes);
      console.info('[auth] wx.login code before wxLogin:', code);
      if (!code) {
        console.error('[auth] wx.login missing code, raw response:', loginRes);
        throw new Error('微信登录失败，请重试');
      }

      const wxLoginPayload = {
        code,
        nickname: profile.nickname || profile.nickName || '',
        avatarUrl: profile.avatarUrl || '',
        gender: typeof profile.gender === 'undefined' ? 0 : Number(profile.gender || 0)
      };
      console.info('[auth] /api/auth/wx-login request payload:', wxLoginPayload);

      const authPayload = await wxLogin(wxLoginPayload);

      const token = authPayload.token || authPayload.authToken || authPayload.accessToken || '';
      const me = normalizeUser(authPayload.user || authPayload.me || authPayload.profile || authPayload);

      if (!token) {
        throw new Error('登录成功但未获取到凭证');
      }

      this.persistAuthState({ token, me });
      return this.globalData.me;
    } catch (error) {
      this.clearAuthState({ keepError: true });
      this.setAuthState({
        authError: error.message || '登录失败，请稍后重试',
        authStatus: 'anonymous'
      });
      throw error;
    } finally {
      this.setAuthState({
        authLoading: false,
        authReady: true,
        authStatus: this.globalData.authToken ? 'authenticated' : 'anonymous'
      });
      console.info('[auth] loginFlow(finally)', {
        authToken: this.globalData.authToken,
        authLoading: this.globalData.authLoading,
        authReady: this.globalData.authReady,
        authStatus: this.globalData.authStatus,
        me: this.globalData.me
      });
    }
  },

  async handleUnauthorized(error = {}) {
    this.clearAuthState({ keepError: true });
    this.setAuthState({
      authError: error.message || '登录状态已失效，请重新登录',
      authLoading: false,
      authReady: true,
      authStatus: 'anonymous'
    });

    if (this.reloginPromise) {
      return this.reloginPromise;
    }

    this.reloginPromise = this.ensureLogin({ force: true, silent: true })
      .catch((reloginError) => {
        console.warn('relogin failed', reloginError);
        return null;
      })
      .finally(() => {
        this.reloginPromise = null;
      });

    return this.reloginPromise;
  },

  async loginWithWechat(profile = {}) {
    return this.ensureLogin({ force: true, profile });
  },

  async logout() {
    this.clearAuthState();
    this.setAuthState({
      authLoading: false,
      authReady: true,
      authStatus: 'anonymous'
    });
    return Promise.resolve();
  }
});
