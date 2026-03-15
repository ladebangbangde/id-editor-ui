Component({
  properties: {
    text: { type: String, value: '确认' },
    loading: { type: Boolean, value: false },
    disabled: { type: Boolean, value: false },
    type: { type: String, value: 'primary' }
  },
  methods: {
    handleTap() {
      if (this.data.loading || this.data.disabled) return;
      this.triggerEvent('tap');
    }
  }
});
