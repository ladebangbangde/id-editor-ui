const { STORAGE_KEYS } = require('../../utils/constants');
const { createOrder, mockPay, getDownloadUrl } = require('../../utils/api');
const storage = require('../../utils/storage');

Page({
  data: {
    result: null
  },

  onShow() {
    const result = storage.get(STORAGE_KEYS.CURRENT_RESULT, null);
    this.setData({ result });
  },

  async savePreview() {
    const { result } = this.data;
    if (!result || !result.resultId) return;
    try {
      const data = await getDownloadUrl(result.resultId, 'preview');
      wx.setClipboardData({ data: data.url || data.downloadUrl || result.previewUrl || '' });
    } catch (error) {
      wx.showToast({ title: '获取预览下载地址失败', icon: 'none' });
    }
  },

  async payAndDownload(orderType, downloadType) {
    const { result } = this.data;
    if (!result || !result.imageId || !result.resultId) {
      wx.showToast({ title: '结果信息不完整', icon: 'none' });
      return;
    }

    try {
      const order = await createOrder({
        imageId: result.imageId,
        resultId: result.resultId,
        orderType
      });
      await mockPay(order.orderId);
      const download = await getDownloadUrl(result.resultId, downloadType);
      wx.setClipboardData({ data: download.url || download.downloadUrl || '' });
    } catch (error) {
      wx.showToast({ title: error.message || '下载失败', icon: 'none' });
    }
  },

  downloadHd() {
    this.payAndDownload('hd', 'hd');
  },

  downloadLayout() {
    this.payAndDownload('print', 'print');
  },

  remake() {
    wx.redirectTo({ url: '/pages/upload/upload' });
  }
});
