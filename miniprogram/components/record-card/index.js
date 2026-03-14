const { getSizeLabel, getColorLabel, getOrderStatusLabel, formatTime } = require('../../utils/format');

Component({
  properties: {
    record: {
      type: Object,
      value: {}
    }
  },
  data: {
    displaySize: '--',
    displayColor: '--',
    displayTime: '--',
    displayStatus: '--'
  },
  observers: {
    record(val) {
      if (!val) return;
      this.setData({
        displaySize: getSizeLabel(val.sizeType),
        displayColor: getColorLabel(val.backgroundColor),
        displayTime: formatTime(val.createdAt),
        displayStatus: getOrderStatusLabel(val.status)
      });
    }
  },
  methods: {
    handleTap() {
      this.triggerEvent('tap', { record: this.data.record });
    }
  }
});
