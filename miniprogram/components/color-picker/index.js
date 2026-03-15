const { COLOR_OPTIONS } = require('../../utils/constants');
Component({
  properties: {
    value: { type: String, value: 'white' }
  },
  data: {
    options: COLOR_OPTIONS
  },
  methods: {
    handleTap(e) {
      const { value } = e.currentTarget.dataset;
      this.triggerEvent('change', { value });
    }
  }
});
