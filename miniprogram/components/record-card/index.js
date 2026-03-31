const { getStatusLabel } = require('../../utils/format');
const { pickBestImageUrl: pickImageFromCandidates, cleanUrl, isLikelyLocalPath } = require('../../utils/image-url');
const { getPreviewImage } = require('../../utils/image-resource');

function buildThumbUrl(record = {}) {
  return getPreviewImage(record);
}

function normalizeCardCandidates(record = {}) {
  const rawList = Array.isArray(record.candidates) ? record.candidates : [];
  if (!rawList.length) {
    const fallbackUrl = buildThumbUrl(record);
    return fallbackUrl ? [{
      candidateId: `${record.id || 'record'}_default`,
      label: '主图',
      sourceLabel: '',
      imageUrl: fallbackUrl
    }] : [];
  }
  return rawList
    .map((item, index) => {
      const imageUrl = getPreviewImage(item);
      if (!imageUrl) return null;
      return {
        candidateId: item.candidateId || `${record.id || 'record'}_${index + 1}`,
        label: item.label || `方案${index + 1}`,
        sourceLabel: item.sourceLabel || '',
        imageUrl
      };
    })
    .filter(Boolean)
    .slice(0, 2);
}

Component({
  properties: {
    record: { type: Object, value: {} },
    manageMode: { type: Boolean, value: false }
  },
  data: {
    statusText: '',
    thumbUrl: '',
    candidates: [],
    imageLoadFailed: false
  },
  observers: {
    record(v) {
      const thumbUrl = buildThumbUrl(v || {});
      this.setData({
        statusText: getStatusLabel((v || {}).status),
        thumbUrl,
        candidates: normalizeCardCandidates(v || {}),
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
    handleCandidateTap(event) {
      const { index } = event.currentTarget.dataset;
      const candidate = this.data.candidates[index];
      if (!candidate) return;
      this.triggerEvent('tap', { record: this.data.record, candidate });
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
