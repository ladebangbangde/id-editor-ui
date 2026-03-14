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
      const { value } = event.currentTarget.dataset;
      this.triggerEvent('change', { value });
    }
  }
});
