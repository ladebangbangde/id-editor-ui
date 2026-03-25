const { getStatusLabel } = require('../../utils/format');
const { pickBestImageUrl: pickImageFromCandidates, cleanUrl, isLikelyLocalPath } = require('../../utils/image-url');

function buildThumbUrl(record = {}) {
  return pickImageFromCandidates([
    record.displayUrl,
    record.previewUrl,
    record.preview_url,
    record.imageUrl,
    record.resultUrl,
    record.result_url,
    record.hdUrl,
    record.originalUrl
  ]);
}

Component({
  properties: {
    record: { type: Object, value: {} },
    manageMode: { type: Boolean, value: false }
  },
  data: {
    statusText: '',
    thumbUrl: '',
    imageLoadFailed: false
  },
  observers: {
    record(v) {
      const thumbUrl = buildThumbUrl(v || {});
      this.setData({
        statusText: getStatusLabel((v || {}).status),
        thumbUrl,
        imageLoadFailed: false
      });
      console.log('[record-card] bind record image fields', {
        id: v && v.id,
        displayUrl: v && v.displayUrl,
        previewUrl: v && v.previewUrl,
        resultUrl: v && v.resultUrl,
        thumbUrl
      });
      if (!cleanUrl(thumbUrl)) {
        console.warn('[record-card] thumb url empty', v && v.id);
      } else {
        if (/^http:\/\//i.test(thumbUrl)) {
          console.warn('[record-card] thumb url is http, might be blocked on device', v && v.id, thumbUrl);
        }
        if (isLikelyLocalPath(thumbUrl)) {
          console.warn('[record-card] thumb url looks local/private', v && v.id, thumbUrl);
        }
      }
    }
  },
  methods: {
    handleTap() {
      this.triggerEvent('tap', { record: this.data.record });
    },
    handleToggle() {
      this.triggerEvent('toggle', { id: this.data.record.id, record: this.data.record });
    },
    handleImageError(event) {
      console.error('[record-card] image render failed', event && event.detail, this.data.record && this.data.record.id, this.data.thumbUrl);
      this.setData({ imageLoadFailed: true });
    },
    handleEdit() {
      this.triggerEvent('edit', { record: this.data.record });
    },
    handleDelete() {
      this.triggerEvent('delete', { record: this.data.record });
    }
  }
});
