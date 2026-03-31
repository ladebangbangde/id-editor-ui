const { pickBestImageUrl } = require('./image-url');

function getPreviewImage(record = {}) {
  return pickBestImageUrl([
    record.previewUrl,
    record.preview_url,
    record.thumbUrl,
    record.thumbnailUrl,
    record.thumbnail_url,
    record.result && (record.result.previewUrl || record.result.preview_url),
    record.imageUrl,
    record.image_url,
    record.resultUrl,
    record.result_url
  ]);
}

function getHdImage(record = {}) {
  return pickBestImageUrl([
    record.hdUrl,
    record.hd_url,
    record.downloadUrl,
    record.download_url,
    record.resultUrl,
    record.result_url,
    record.originalUrl,
    record.original_url,
    record.imageUrl,
    record.image_url,
    getPreviewImage(record)
  ]);
}

function getDisplayImage(record = {}, scene = 'list') {
  if (scene === 'save' || scene === 'download' || scene === 'hd') {
    return getHdImage(record);
  }
  return getPreviewImage(record);
}

module.exports = {
  getPreviewImage,
  getHdImage,
  getDisplayImage
};
