function promisify(fn, options = {}) {
  return new Promise((resolve, reject) => {
    fn({
      ...options,
      success: resolve,
      fail: reject
    });
  });
}

function showToast(title) {
  wx.showToast({ title, icon: 'none' });
}

async function openPermissionGuide() {
  const modalRes = await promisify(wx.showModal, {
    title: '还差一步',
    content: '想帮你把照片直接放进相册，需要打开“保存到相册”权限。打开后再试一次就好啦。',
    confirmText: '去设置',
    cancelText: '稍后再说'
  }).catch(() => ({ confirm: false }));

  if (!modalRes.confirm) {
    return false;
  }

  const openRes = await promisify(wx.openSetting).catch(() => ({}));
  return !!(openRes.authSetting && openRes.authSetting['scope.writePhotosAlbum']);
}

async function ensureAlbumPermission() {
  const settingRes = await promisify(wx.getSetting).catch(() => ({}));
  const authSetting = settingRes.authSetting || {};
  const current = authSetting['scope.writePhotosAlbum'];

  if (current === true) {
    return true;
  }

  if (current === false) {
    return openPermissionGuide();
  }

  try {
    await promisify(wx.authorize, { scope: 'scope.writePhotosAlbum' });
    return true;
  } catch (error) {
    return openPermissionGuide();
  }
}

async function saveImageFromUrl(url, options = {}) {
  const {
    emptyText = '暂时还没有可保存的图片',
    loadingText = '保存中',
    successText = '已保存到相册',
    permissionDeniedText = '没有拿到相册权限，稍后再试一次也可以',
    failText = '保存没成功，请稍后再试一次'
  } = options;

  if (!url) {
    showToast(emptyText);
    return false;
  }

  const hasPermission = await ensureAlbumPermission();
  if (!hasPermission) {
    showToast(permissionDeniedText);
    return false;
  }

  wx.showLoading({ title: loadingText, mask: true });
  try {
    const downloadRes = await promisify(wx.downloadFile, { url });
    if (downloadRes.statusCode && downloadRes.statusCode >= 400) {
      throw new Error('download failed');
    }

    const filePath = downloadRes.tempFilePath;
    if (!filePath) {
      throw new Error('missing temp file path');
    }

    await promisify(wx.saveImageToPhotosAlbum, { filePath });
    wx.showToast({ title: successText, icon: 'success' });
    return true;
  } catch (error) {
    showToast(failText);
    return false;
  } finally {
    wx.hideLoading();
  }
}

module.exports = {
  saveImageFromUrl
};
