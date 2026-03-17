const { STORAGE_KEYS, MOCK_RESULT } = require('../../utils/constants');
const { createOrder, mockPay, getOrder, downloadPreview, downloadHd, downloadPrint } = require('../../utils/api');
const storage = require('../../utils/storage');

Page({
  data: {
    result: null,
    orderMap: {}
  },

  onShow() {
    const result = storage.get(STORAGE_KEYS.CURRENT_RESULT, null) || MOCK_RESULT;
    this.setData({ result });
  },

  async savePreview() {
    const { result } = this.data;
    if (!result || !result.resultId) {
      wx.showToast({ title: '无可用结果', icon: 'none' });
      return;
    }

    try {
      const data = await downloadPreview(result.resultId);
      wx.setClipboardData({
        data: data.downloadUrl || data.url || '',
        success: () => wx.showToast({ title: '预览图链接已复制', icon: 'none' })
      });
    } catch (error) {
      wx.showToast({ title: '预览下载失败', icon: 'none' });
    }
  },

  async ensurePaidOrder(orderType) {
    const { result, orderMap } = this.data;
    const cached = orderMap[orderType];
    if (cached) {
      try {
        const order = await getOrder(cached);
        if (order && order.status === 'paid') {
          return cached;
        }
      } catch (error) {
        console.warn('get order failed', error);
      }
    }

    const created = await createOrder({
      imageId: result.imageId,
      resultId: result.resultId,
      orderType
    });

    const orderId = created.orderId || created.id;
    if (!orderId) throw new Error('创建订单失败');

    await mockPay(orderId);

    this.setData({
      orderMap: {
        ...orderMap,
        [orderType]: orderId
      }
    });

    return orderId;
  },

  async downloadHd() {
    const { result } = this.data;
    if (!result || !result.resultId) return;

    try {
      await this.ensurePaidOrder('hd');
      const data = await downloadHd(result.resultId);
      wx.setClipboardData({
        data: data.downloadUrl || data.url || '',
        success: () => wx.showToast({ title: '高清图链接已复制', icon: 'none' })
      });
    } catch (error) {
      wx.showToast({ title: error.message || '高清下载失败', icon: 'none' });
    }
  },

  async downloadLayout() {
    const { result } = this.data;
    if (!result || !result.resultId) return;

    try {
      await this.ensurePaidOrder('print');
      const data = await downloadPrint(result.resultId);
      wx.setClipboardData({
        data: data.downloadUrl || data.url || '',
        success: () => wx.showToast({ title: '排版图链接已复制', icon: 'none' })
      });
    } catch (error) {
      wx.showToast({ title: error.message || '排版下载失败', icon: 'none' });
    }
  },

  remake() {
    wx.redirectTo({ url: '/pages/upload/upload' });
  }
});
