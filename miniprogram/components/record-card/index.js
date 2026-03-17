const { getStatusLabel } = require('../../utils/format');
Component({
  properties: {
    record: { type: Object, value: {} }
  },
  data: {
    statusText: ''
  },
  observers: {
    record(v) {
      this.setData({ statusText: getStatusLabel(v.status) });
    }
  },
  methods: {
    handleTap() {
      this.triggerEvent('tap', { record: this.data.record });
    }
  }
});
