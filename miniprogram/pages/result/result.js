const {
  createOrder,
  mockPayOrder,
  getDownloadHd,
  getDownloadPreview,
  getDownloadPrint,
  getOrder
} = require('../../utils/api');
const storage = require('../../utils/storage');
const { PAGE_TEXT } = require('../../utils/constants');
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

  async onLoad(options) {
    await this.loadResult(options);
  },

  async loadResult(options) {
    const cached = storage.getLastResult();
    if (!cached || (options.imageId && cached.imageId !== options.imageId)) {
      this.setData({ loading: false });
      wx.showToast({ title: 'Result expired, please generate again.', icon: 'none' });
      return;
    }

    const result = {
      ...cached,
      resultId: cached.resultId || options.resultId || ''
    };

    if (!result.previewUrl && result.resultId) {
      try {
        const previewRes = await getDownloadPreview(result.resultId);
        const previewData = previewRes.data || {};
        result.previewUrl = previewData.downloadUrl || previewData.url || '';
      } catch (error) {
        // keep empty preview, user can still use paid download buttons
      }
    }

    this.setData({
      result,
      loading: false,
      sizeLabel: getSizeLabel(result.sizeType),
      colorLabel: getColorLabel(result.backgroundColor)
    });
  },

  handleImageError() {
    this.setData({ imageError: true });
    wx.showToast({ title: 'Preview failed to load', icon: 'none' });
  },

  handleRetry() {
    wx.navigateBack({ delta: 1 });
  },

  async ensurePaidOrder(orderType) {
    const result = this.data.result;
    const orderRes = await createOrder({
      imageId: result.imageId,
      resultId: result.resultId,
      orderType
    });

    const order = orderRes.data || {};
    const orderId = order.orderId || order.id;
    if (!orderId) {
      throw new Error('Order id missing');
    }

    await mockPayOrder(orderId);
    const refreshed = await getOrder(orderId);
    return refreshed.data || order;
  },

  async saveByDownloadApi(apiFn, resultId) {
    const downloadRes = await apiFn(resultId);
    const data = downloadRes.data || {};
    const url = data.downloadUrl || data.url;
    if (!url) {
      throw new Error('No download url returned');
    }
    wx.setClipboardData({ data: url });
    wx.showToast({ title: 'Download URL copied', icon: 'none' });
  },

  async handleDownloadHd() {
    const result = this.data.result;

    if (!result || !result.imageId || !result.resultId) {
      wx.showToast({ title: 'Missing image/result data', icon: 'none' });
      return;
    }

    if (this.data.downloading) return;
    this.setData({ downloading: true });

    try {
      await this.ensurePaidOrder('hd');
      await this.saveByDownloadApi(getDownloadHd, result.resultId);
      this.setData({ result: { ...result, paid: true, status: 'paid' } });
    } catch (error) {
      wx.showToast({ title: error.message || 'HD download failed', icon: 'none' });
    } finally {
      this.setData({ downloading: false });
    }
  },

  async handlePrintLayout() {
    const result = this.data.result;
    if (!result || !result.resultId) {
      wx.showToast({ title: 'Missing result data', icon: 'none' });
      return;
    }

    if (this.data.downloading) return;
    this.setData({ downloading: true });

    try {
      await this.ensurePaidOrder('print');
      await this.saveByDownloadApi(getDownloadPrint, result.resultId);
      this.setData({ result: { ...result, paid: true, status: 'paid' } });
    } catch (error) {
      wx.showToast({ title: error.message || 'Print download failed', icon: 'none' });
    } finally {
      this.setData({ downloading: false });
    }
  },

  async handleCopyPreviewUrl() {
    const result = this.data.result;
    if (!result || !result.resultId) {
      wx.showToast({ title: 'Missing result data', icon: 'none' });
      return;
    }

    try {
      await this.saveByDownloadApi(getDownloadPreview, result.resultId);
    } catch (error) {
      wx.showToast({ title: error.message || 'Get preview URL failed', icon: 'none' });
    }
  }
});
