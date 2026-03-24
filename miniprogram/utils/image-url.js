function isString(v) {
  return typeof v === 'string';
}

function cleanUrl(url = '') {
  if (!isString(url)) return '';
  return url.trim();
}

function isHttpUrl(url = '') {
  return /^https?:\/\//i.test(url);
}

function isLikelyLocalPath(url = '') {
  const value = cleanUrl(url).toLowerCase();
  if (!value) return true;

  if (value.startsWith('wxfile://')
    || value.startsWith('file://')
    || value.startsWith('tmp/')
    || value.startsWith('/tmp/')
    || value.startsWith('blob:')) {
    return true;
  }

  const localHostPattern = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i;
  const privateIpv4Pattern = /^https?:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/i;

  return localHostPattern.test(value) || privateIpv4Pattern.test(value);
}

function normalizeForImageTag(url = '') {
  const value = cleanUrl(url);
  if (!value) return '';

  try {
    return encodeURI(value);
  } catch (error) {
    return value;
  }
}

function pickBestImageUrl(candidates = []) {
  const list = Array.isArray(candidates) ? candidates : [candidates];
  const cleaned = list
    .map(cleanUrl)
    .filter(Boolean);

  const remote = cleaned.find((url) => isHttpUrl(url) && !isLikelyLocalPath(url));
  if (remote) return normalizeForImageTag(remote);

  const nonLocal = cleaned.find((url) => !isLikelyLocalPath(url));
  if (nonLocal) return normalizeForImageTag(nonLocal);

  return normalizeForImageTag(cleaned[0] || '');
}

module.exports = {
  cleanUrl,
  isLikelyLocalPath,
  normalizeForImageTag,
  pickBestImageUrl
};
