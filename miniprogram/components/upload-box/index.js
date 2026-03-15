Component({
  properties: {
    image: { type: String, value: '' }
  },
  methods: {
    handleTap() {
      this.triggerEvent('tap');
    }
  }
});
