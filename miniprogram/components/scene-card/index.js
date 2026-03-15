Component({
  properties: {
    item: { type: Object, value: {} }
  },
  methods: {
    handleTap() {
      this.triggerEvent('tap', { item: this.data.item });
    }
  }
});
