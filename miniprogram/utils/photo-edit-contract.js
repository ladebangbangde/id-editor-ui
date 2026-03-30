const { toCanonicalSizeCode, buildSceneBySizeCode } = require('./size-codes');

const API_BACKGROUND_VALUES = ['white', 'blue', 'red'];
const BACKGROUND_COLOR_LABEL_MAP = {
  white: '白色',
  blue: '蓝色',
  red: '红色'
};

const BACKGROUND_COLOR_ALIAS_TO_API = {
  white: 'white',
  '白色': 'white',
  '白': 'white',
  '白底': 'white',
  blue: 'blue',
  '蓝色': 'blue',
  '蓝': 'blue',
  '蓝底': 'blue',
  red: 'red',
  '红色': 'red',
  '红': 'red',
  '红底': 'red'
};

const SIZE_TEXT_KEYWORD_MAP = {
  '一寸': 'one_inch',
  '小一寸': 'small_one_inch',
  '二寸': 'two_inch',
  '护照': 'one_inch',
  '签证': 'one_inch',
  '简历': 'one_inch',
  '考试': 'two_inch'
};

const SIZE_MM_MAP = {
  '25x35': 'one_inch',
  '22x32': 'small_one_inch',
  '35x49': 'two_inch',
  '35x45': 'two_inch',
  '33x48': 'one_inch'
};

function normalizeAliasText(value = '') {
  return String(value || '').trim().toLowerCase();
}

function normalizeBackgroundColorForApi(value = '', fallback = 'white') {
  const normalized = normalizeAliasText(value);
  if (BACKGROUND_COLOR_ALIAS_TO_API[normalized]) {
    return BACKGROUND_COLOR_ALIAS_TO_API[normalized];
  }
  if (API_BACKGROUND_VALUES.includes(normalized)) {
    return normalized;
  }
  return fallback;
}

function getBackgroundColorLabel(value = '') {
  const apiValue = normalizeBackgroundColorForApi(value, '');
  return BACKGROUND_COLOR_LABEL_MAP[apiValue] || '--';
}

function normalizeCandidateList(candidates = []) {
  if (!Array.isArray(candidates)) return [];
  return candidates
    .map((candidate, index) => {
      const source = String(candidate.source || '').trim().toLowerCase();
      const imageUrl = candidate.imageUrl || candidate.previewUrl || candidate.resultUrl || candidate.hdUrl || '';
      if (!imageUrl) return null;
      return {
        candidateId: candidate.candidateId || `candidate_${index + 1}`,
        source,
        sourceLabel: candidate.sourceLabel || (source === 'baidu' ? '百度方案' : ((source === 'local' || source === 'legacy') ? '本地方案' : '候选方案')),
        label: candidate.label || '',
        imageUrl,
        previewUrl: candidate.previewUrl || imageUrl,
        resultUrl: candidate.resultUrl || imageUrl,
        hdUrl: candidate.hdUrl || candidate.resultUrl || imageUrl
      };
    })
    .filter(Boolean)
    .slice(0, 2);
}

function extractMmPairFromText(text = '') {
  const match = String(text || '').match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) return null;
  return [Math.round(width), Math.round(height)];
}

function normalizeSizeCodeForApi(input = {}) {
  const codeCandidates = [
    input.sizeCode,
    input.selectedSizeCode,
    input.sceneKey,
    input.selectedScene && input.selectedScene.sceneKey
  ];
  for (const rawCode of codeCandidates) {
    const canonical = toCanonicalSizeCode(rawCode);
    if (canonical) return canonical;
  }

  const textCandidates = [
    input.sceneName,
    input.remakeSceneName,
    input.sizeText,
    input.remakeSizeText,
    input.selectedScene && input.selectedScene.sceneName
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  for (const text of textCandidates) {
    const hit = Object.keys(SIZE_TEXT_KEYWORD_MAP).find((keyword) => text.includes(keyword));
    if (hit) return SIZE_TEXT_KEYWORD_MAP[hit];
  }

  const mmPair = extractMmPairFromText([
    input.sizeText,
    input.remakeSizeText,
    `${input.widthMm || ''}x${input.heightMm || ''}`,
    `${input.selectedScene && input.selectedScene.widthMm || ''}x${input.selectedScene && input.selectedScene.heightMm || ''}`
  ].join(' '));
  if (mmPair) {
    const mmKey = `${mmPair[0]}x${mmPair[1]}`;
    if (SIZE_MM_MAP[mmKey]) return SIZE_MM_MAP[mmKey];
  }

  return '';
}

function buildSceneForDraft(input = {}, sizeCode = '') {
  const scene = input.sceneInfo || input.selectedScene || null;
  if (scene && scene.sceneKey) return scene;
  return buildSceneBySizeCode(sizeCode) || null;
}

function normalizeHistoryRecordToEditDraft(record = {}, options = {}) {
  const candidates = normalizeCandidateList(record.candidates);
  const selectedCandidateId = options.selectedCandidateId || record.selectedCandidateId || (candidates[0] && candidates[0].candidateId) || '';
  const selectedCandidate = candidates.find((item) => item.candidateId === selectedCandidateId) || candidates[0] || null;
  const sizeCode = normalizeSizeCodeForApi(record);
  const backgroundColor = normalizeBackgroundColorForApi(
    record.backgroundColorValue || record.backgroundColor || record.backgroundColorLabel || record.background
  );
  const backgroundColorLabel = getBackgroundColorLabel(backgroundColor);
  const selectedScene = buildSceneForDraft(record, sizeCode);
  const sceneName = record.sceneName || (selectedScene && selectedScene.sceneName) || '--';
  const sizeText = record.sizeText
    || ((selectedScene && selectedScene.widthMm && selectedScene.heightMm) ? `${selectedScene.widthMm}×${selectedScene.heightMm}mm` : '--');

  return {
    flowType: 'idPhoto',
    flowMode: 'template',
    needSelectSize: false,
    fromHistoryTaskId: record.taskId || record.id || '',
    selectedScene,
    selectedSizeCode: sizeCode,
    sizeCode,
    backgroundColor,
    sourceImagePath: '',
    sourceImageUrl: (selectedCandidate && selectedCandidate.imageUrl) || record.sourceImageUrl || record.previewUrl || record.displayUrl || '',
    selectedCandidateId: selectedCandidate ? selectedCandidate.candidateId : '',
    remakeCandidates: candidates,
    remakeSelectedCandidateId: selectedCandidate ? selectedCandidate.candidateId : '',
    remakeSceneName: sceneName,
    remakeSizeText: sizeText,
    remakeBackgroundColorLabel: backgroundColorLabel,
    backgroundColorLabel,
    displayMeta: {
      sceneName,
      sizeText,
      backgroundColorLabel,
      currentCandidatePreview: (selectedCandidate && selectedCandidate.imageUrl) || '',
      candidates: candidates.map((item) => ({
        candidateId: item.candidateId,
        sourceLabel: item.sourceLabel || item.label,
        imageUrl: item.imageUrl
      }))
    }
  };
}

function normalizeEditDraftToPhotoRequest(draft = {}) {
  const sizeCode = normalizeSizeCodeForApi(draft);
  const backgroundColor = normalizeBackgroundColorForApi(
    draft.backgroundColor || draft.backgroundColorLabel || draft.remakeBackgroundColorLabel
  );

  return {
    sizeCode,
    backgroundColor
  };
}

module.exports = {
  normalizeBackgroundColorForApi,
  getBackgroundColorLabel,
  normalizeSizeCodeForApi,
  normalizeHistoryRecordToEditDraft,
  normalizeEditDraftToPhotoRequest
};
