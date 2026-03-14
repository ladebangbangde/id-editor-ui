const { uploadFile } = require('./request');

function getBaseUrl() {
  const app = getApp();
  return app.globalData.apiBaseUrl;
}

function uploadImageFile(filePath, extraData = {}) {
  return uploadFile(`${getBaseUrl()}/upload`, filePath, extraData, {
    showLoading: true,
    loadingText: 'Uploading image...'
  });
}

module.exports = {
  uploadImageFile
};
