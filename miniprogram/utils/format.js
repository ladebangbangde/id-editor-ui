const { COLOR_OPTIONS, SIZE_OPTIONS, ORDER_STATUS_MAP } = require('./constants');

function pad2(num) {
  return num < 10 ? `0${num}` : `${num}`;
}

function formatTime(input) {
  if (!input) return '--';
  if (typeof input === 'string') return input;

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '--';

  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const h = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  const s = pad2(date.getSeconds());
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

function getColorLabel(value) {
  const item = COLOR_OPTIONS.find((option) => option.value === value);
  return item ? item.label : 'Unknown';
}

function getSizeLabel(value) {
  const item = SIZE_OPTIONS.find((option) => option.value === value);
  return item ? item.label : 'Unknown';
}

function getOrderStatusLabel(status) {
  return ORDER_STATUS_MAP[status] || 'Unknown';
}

module.exports = {
  formatTime,
  getColorLabel,
  getSizeLabel,
  getOrderStatusLabel
};
