const { STORAGE_KEYS } = require('./constants');
const storage = require('./storage');

function createDefaultDraft() {
  return {
    sourceImagePath: '',
    sourceImageUrl: '',
    flowType: 'idPhoto',
    flowMode: 'free',
    needSelectSize: true,
    selectedScene: null,
    selectedSizeCode: '',
    customSize: null,
    backgroundColor: 'white',
    formalWearOption: 'none',
    fromHistoryTaskId: ''
  };
}

function normalizeDraft(draft = {}) {
  return {
    ...createDefaultDraft(),
    ...(draft || {}),
    selectedScene: draft && typeof draft.selectedScene === 'object' ? draft.selectedScene : null,
    customSize: draft && typeof draft.customSize === 'object' ? draft.customSize : null
  };
}

function getFlowDraft() {
  return normalizeDraft(storage.get(STORAGE_KEYS.FLOW_DRAFT, {}));
}

function setFlowDraft(patch = {}) {
  const merged = normalizeDraft({
    ...getFlowDraft(),
    ...(patch || {})
  });
  storage.set(STORAGE_KEYS.FLOW_DRAFT, merged);
  return merged;
}

function resetFlowDraft(next = {}) {
  const draft = normalizeDraft(next);
  storage.set(STORAGE_KEYS.FLOW_DRAFT, draft);
  return draft;
}

module.exports = {
  createDefaultDraft,
  normalizeDraft,
  getFlowDraft,
  setFlowDraft,
  resetFlowDraft
};
