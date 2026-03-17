Component({
  properties: {
    value: {
      type: String,
      value: ''
    },
    options: {
      type: Array,
      value: []
    }
  },
  methods: {
    handleTap(event) {
      const dataset = (event && event.currentTarget && event.currentTarget.dataset) || {};
      const value = dataset.value;
      if (!value) return;
      this.triggerEvent('change', { value });
    }
  }
});
