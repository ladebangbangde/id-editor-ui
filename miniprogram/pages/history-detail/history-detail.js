const storage = require('../../utils/storage');
const { getImageDetail, createOrder } = require('../../utils/api');
const { getColorLabel, getSizeLabel, getOrderStatusLabel, formatTime } = require('../../utils/format');
const { DEFAULT_PRICE } = require('../../utils/constants');

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
    if (cached && (!imageId || cached.imageId === imageId)) {
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
      this.applyRecord(res.data || {});
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
    if (!record || !record.imageId) {
      wx.showToast({ title: 'Invalid record', icon: 'none' });
      return;
    }

    if (this.data.actionLoading) return;
    this.setData({ actionLoading: true });

    try {
      if (record.status !== 'paid') {
        const app = getApp();
        const orderRes = await createOrder({
          userId: app.globalData.demoUserId,
          imageId: record.imageId,
          amount: DEFAULT_PRICE
        });
        const orderData = orderRes.data || {};
        wx.showModal({
          title: 'Payment Required',
          content: `Order ${orderData.orderId || ''} is ${orderData.status || 'pending'}. Please complete payment first.`,
          showCancel: false
        });
        return;
      }
      wx.showToast({ title: 'Download flow reserved', icon: 'none' });
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
