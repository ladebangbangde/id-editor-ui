const storage = require('../../utils/storage');
const {
  getImageDetail,
  mapHistoryItem,
  createOrder,
  mockPayOrder,
  getDownloadHd
} = require('../../utils/api');
const { getColorLabel, getSizeLabel, getOrderStatusLabel, formatTime } = require('../../utils/format');

Page({
  data: {
    record: null,
    loading: true,
    sizeLabel: '--',
    colorLabel: '--',
    statusLabel: '--',
    timeLabel: '--',
    actionLoading: false
  },

  onLoad(options) {
    this.initData(options.imageId);
  },

  async initData(imageId) {
    const cached = storage.get('current_record');
    if (cached && (!imageId || cached.imageId === imageId) && cached.resultId) {
      this.applyRecord(cached);
      return;
    }

    if (!imageId) {
      this.setData({ loading: false });
      wx.showToast({ title: 'Missing record id', icon: 'none' });
      return;
    }

    try {
      const res = await getImageDetail(imageId);
      this.applyRecord(mapHistoryItem(res.data || {}));
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: error.message || 'Load detail failed', icon: 'none' });
    }
  },

  applyRecord(record) {
    this.setData({
      record,
      loading: false,
      sizeLabel: getSizeLabel(record.sizeType),
      colorLabel: getColorLabel(record.backgroundColor),
      statusLabel: getOrderStatusLabel(record.status || 'pending'),
      timeLabel: formatTime(record.createdAt)
    });
  },

  async handleDownloadAgain() {
    const record = this.data.record;
    if (!record || !record.imageId || !record.resultId) {
      wx.showToast({ title: 'Invalid record', icon: 'none' });
      return;
    }

    if (this.data.actionLoading) return;
    this.setData({ actionLoading: true });

    try {
      const orderRes = await createOrder({
        imageId: record.imageId,
        resultId: record.resultId,
        orderType: 'hd'
      });
      const orderData = orderRes.data || {};
      const orderId = orderData.orderId || orderData.id;
      if (!orderId) throw new Error('Order id missing');
      await mockPayOrder(orderId);
      const hdRes = await getDownloadHd(record.resultId);
      const url = hdRes.data && (hdRes.data.downloadUrl || hdRes.data.url);
      if (!url) throw new Error('No HD URL returned');
      wx.setClipboardData({ data: url });
      wx.showToast({ title: 'HD URL copied', icon: 'none' });
      this.setData({
        record: { ...record, status: 'paid' },
        statusLabel: getOrderStatusLabel('paid')
      });
    } catch (error) {
      wx.showToast({ title: error.message || 'Order creation failed', icon: 'none' });
    } finally {
      this.setData({ actionLoading: false });
    }
  },

  handleRemakeSame() {
    const record = this.data.record || {};
    wx.switchTab({
      url: '/pages/index/index',
      success: () => {
        storage.set('remake_option', {
          sizeType: record.sizeType,
          backgroundColor: record.backgroundColor
        });
      }
    });
  }
});
