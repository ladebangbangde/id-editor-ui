Component({
  properties: {
    image: { type: String, value: '' }
  },
  methods: {
    handleTap() {
      // 不使用 `tap` 作为自定义事件名，避免与原生 tap 冒泡重名导致重复触发。
      this.triggerEvent('select');
    }
  }
});
