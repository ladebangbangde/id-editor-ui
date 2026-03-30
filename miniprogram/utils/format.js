const { COLOR_OPTIONS, STATUS_MAP } = require('./constants');

const COLOR_ALIAS_MAP = {
  white: 'white',
  白色: 'white',
  白: 'white',
  白底: 'white',
  blue: 'blue',
  蓝色: 'blue',
  蓝: 'blue',
  蓝底: 'blue',
  red: 'red',
  红色: 'red',
  红: 'red',
  红底: 'red'
};

function formatTime(dateValue) {
  if (!dateValue) return '--';
  if (typeof dateValue === 'string') return dateValue;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '--';
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  const h = `${d.getHours()}`.padStart(2, '0');
  const min = `${d.getMinutes()}`.padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

function normalizeBackgroundColorValue(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const lowered = raw.toLowerCase();
  return COLOR_ALIAS_MAP[lowered] || COLOR_ALIAS_MAP[raw] || '';
}

function getColorLabel(value) {
  const normalizedValue = normalizeBackgroundColorValue(value);
  const item = COLOR_OPTIONS.find((color) => color.value === normalizedValue);
  return item ? item.label : '未知';
}

function getStatusLabel(status) {
  return STATUS_MAP[status] || '未知';
}

module.exports = {
  formatTime,
  getColorLabel,
  getStatusLabel,
  normalizeBackgroundColorValue
};
