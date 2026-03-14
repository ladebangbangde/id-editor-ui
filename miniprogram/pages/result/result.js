const { createOrder } = require('../../utils/api');
const storage = require('../../utils/storage');
const { DEFAULT_PRICE, PAGE_TEXT } = require('../../utils/constants');
const { getColorLabel, getSizeLabel } = require('../../utils/format');

Page({
  data: {
    result: null,
    pageText: PAGE_TEXT,
    loading: true,
    imageError: false,
    downloading: false,
    sizeLabel: '--',
    colorLabel: '--'
  },

  onLoad(options) {
    this.loadResult(options);
  },

  loadResult(options) {
    const cached = storage.getLastResult();
    if (!cached || (options.imageId && cached.imageId !== options.imageId)) {
      this.setData({ loading: false });
      wx.showToast({ title: 'Result expired, please generate again.', icon: 'none' });
      return;
    }

    this.setData({
      result: cached,
      loading: false,
      sizeLabel: getSizeLabel(cached.sizeType),
      colorLabel: getColorLabel(cached.backgroundColor)
    });
  },

  handleImageError() {
    this.setData({ imageError: true });
    wx.showToast({ title: 'Preview failed to load', icon: 'none' });
  },

  handleRetry() {
    wx.navigateBack({ delta: 1 });
  },

  async handleDownloadHd() {
    const app = getApp();
    const userId = app.globalData.demoUserId;
    const result = this.data.result;

    if (!result || !result.imageId) {
      wx.showToast({ title: 'Missing image data', icon: 'none' });
      return;
    }

    if (this.data.downloading) return;
    this.setData({ downloading: true });

    try {
      if (!result.paid) {
        const orderRes = await createOrder({
          userId,
          imageId: result.imageId,
          amount: DEFAULT_PRICE
        });

        const order = orderRes.data || {};
        wx.showModal({
          title: 'Payment Required',
          content: `Order ${order.orderId || ''} is ${order.status || 'pending'}. Please complete purchase first.`,
          showCancel: false
        });

        // Reserved for future wx.requestPayment integration.
        return;
      }

      wx.showToast({ title: 'HD download flow reserved', icon: 'none' });
    } catch (error) {
      wx.showToast({ title: error.message || 'Create order failed', icon: 'none' });
    } finally {
      this.setData({ downloading: false });
    }
  },

  handlePrintLayout() {
    wx.showToast({ title: PAGE_TEXT.COMING_SOON, icon: 'none' });
  }
});
