Page({
  goHistory() {
    wx.switchTab({ url: '/pages/history/history' });
  },
  tapItem() {
    wx.showToast({ title: '功能建设中', icon: 'none' });
  }
});
