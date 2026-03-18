const { getStatusLabel } = require('../../utils/format');

Component({
  properties: {
    record: { type: Object, value: {} },
    manageMode: { type: Boolean, value: false }
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
    },
    handleToggle() {
      this.triggerEvent('toggle', { id: this.data.record.id, record: this.data.record });
    },
    handleEdit() {
      this.triggerEvent('edit', { record: this.data.record });
    },
    handleDelete() {
      this.triggerEvent('delete', { record: this.data.record });
    }
  }
});
