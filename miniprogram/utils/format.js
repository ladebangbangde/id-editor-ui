const { COLOR_OPTIONS, STATUS_MAP } = require('./constants');

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

function getColorLabel(value) {
  const item = COLOR_OPTIONS.find((color) => color.value === value);
  return item ? item.label : '未知';
}

function getStatusLabel(status) {
  return STATUS_MAP[status] || '未知';
}

module.exports = {
  formatTime,
  getColorLabel,
  getStatusLabel
};
