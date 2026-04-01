const { getPhotoTask } = require('../../utils/api');
const { formatTime } = require('../../utils/format');
const { saveImageFromUrl } = require('../../utils/save-image');
const { setFlowDraft } = require('../../utils/flow-draft');
const { normalizeHistoryRecordToEditDraft, getBackgroundColorLabel } = require('../../utils/photo-edit-contract');
const {
  getFriendlySceneName,
  getFriendlySceneHint,
  getFriendlySizeText,
  pickBestImageUrl
} = require('../../utils/photo-display');
const {
  deriveDisplayState,
  getFriendlyStatusText,
  getFriendlyIssueText,
  getFriendlyWarnings,
  getFriendlySaveHint
} = require('../../utils/photo-status-text');

function normalizeDetail(detail = {}) {
  const warnings = getFriendlyWarnings(Array.isArray(detail.warnings) ? detail.warnings : []);
  const reviewState = deriveDisplayState(detail);

  const normalizedCandidates = Array.isArray(detail.candidates)
    ? detail.candidates
      .map((candidate, index) => {
        const source = String(candidate.source || '').trim().toLowerCase();
        const sourceLabel = candidate.sourceLabel
          || (source === 'baidu' ? '百度方案' : ((source === 'legacy' || source === 'local') ? '本地方案' : '候选方案'));
        const imageUrl = candidate.imageUrl || candidate.previewUrl || candidate.resultUrl || candidate.hdUrl || '';
        if (!imageUrl) return null;
        return {
          candidateId: candidate.candidateId || `candidate_${index + 1}`,
          label: candidate.label || sourceLabel || `方案${index + 1}`,
          sourceLabel,
          imageUrl,
          previewUrl: candidate.previewUrl || imageUrl,
          resultUrl: candidate.resultUrl || imageUrl,
          hdUrl: candidate.hdUrl || candidate.resultUrl || imageUrl
        };
      })
      .filter(Boolean)
      .slice(0, 2)
    : [];

  return {
    taskId: detail.taskId || detail.id,
    imageId: detail.imageId || '',
    sceneName: getFriendlySceneName(detail, '证件照'),
    sceneHint: getFriendlySceneHint(detail),
    sizeText: getFriendlySizeText(detail),
    sizeCode: detail.sizeCode || '',
    backgroundColorValue: detail.backgroundColor || '',
    backgroundColorLabel: detail.backgroundColorLabel
      || (detail.backgroundColor ? getBackgroundColorLabel(detail.backgroundColor) : '')
      || detail.backgroundColor
      || '--',
    previewUrl: detail.previewUrl || detail.resultUrl || detail.originalUrl || '',
    resultUrl: detail.resultUrl || detail.previewUrl || '',
    hdUrl: detail.hdUrl || detail.resultUrl || detail.previewUrl || '',
    printLayoutUrl: detail.printLayoutUrl || detail.layoutUrl || '',
    displayUrl: pickBestImageUrl(detail),
    sourceImageUrl: detail.originalUrl || detail.sourceImageUrl || '',
    sourceImagePath: detail.sourceImagePath || '',
    sceneInfo: detail.scene || {
      sceneKey: detail.sceneKey || detail.sizeCode || '',
      sceneName: detail.sceneName || '',
      widthMm: detail.widthMm || 0,
      heightMm: detail.heightMm || 0
    },
    qualityStatus: reviewState === 'failed'
      ? '不建议直接使用'
      : getFriendlyStatusText(detail.qualityStatus || detail.status || (reviewState === 'warning' ? 'WARNING' : 'SUCCESS')),
    qualityMessage: warnings[0] || getFriendlyIssueText(detail.code || '', detail.qualityMessage || ''),
    warnings,
    candidates: normalizedCandidates,
    fileDesc: getFriendlySaveHint(reviewState),
    createdAt: formatTime(detail.createdAt)
  };
}

Page({
  data: {
    record: null,
    selectedCandidateId: ''
  },

  onLoad(options) {
    const taskId = options.taskId || options.imageId;
    this.setData({ selectedCandidateId: options.candidateId || '' });
    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline']
    });
    if (!taskId) return;
    this.fetchDetail(taskId);
  },

  buildSharePayload() {
    const { record, selectedCandidateId } = this.data;
    const candidates = record && Array.isArray(record.candidates) ? record.candidates : [];
    const selectedCandidate = candidates.find((item) => item && item.candidateId === selectedCandidateId) || candidates[0] || null;
    const sceneName = (record && record.sceneName) || '证件照';
    const sizeText = (record && record.sizeText) || '';
    const title = sizeText
      ? `这张${sceneName}（${sizeText}）是我在棒棒证件照做的`
      : `这张标准${sceneName}是我在棒棒证件照做的`;
    const imageUrl = (selectedCandidate && (selectedCandidate.previewUrl || selectedCandidate.imageUrl || selectedCandidate.hdUrl))
      || (record && (record.displayUrl || record.previewUrl || record.resultUrl || record.hdUrl))
      || '';
    return {
      title,
      path: '/pages/home/home?from=share_history_detail',
      imageUrl
    };
  },

  onShareAppMessage() {
    const payload = this.buildSharePayload();
    return {
      title: payload.title || '我在棒棒证件照做了一张标准证件照',
      path: payload.path || '/pages/home/home',
      imageUrl: payload.imageUrl || undefined
    };
  },

  onShareTimeline() {
    const payload = this.buildSharePayload();
    return {
      title: payload.title || '棒棒证件照｜一键生成规范证件照',
      query: 'from=share_timeline_history_detail',
      imageUrl: payload.imageUrl || undefined
    };
  },

  async fetchDetail(taskId) {
    try {
      const detail = await getPhotoTask(taskId);
      const record = normalizeDetail(detail);
      const selectedCandidateId = this.data.selectedCandidateId;
      const selectedCandidate = (record.candidates || []).find((candidate) => candidate.candidateId === selectedCandidateId)
        || (record.candidates || [])[0]
        || null;
      this.setData({
        record: {
          ...record,
          displayUrl: selectedCandidate ? selectedCandidate.imageUrl : record.displayUrl
        }
      });
    } catch (error) {
      wx.showToast({ title: '历史详情加载失败', icon: 'none' });
      this.setData({ record: null });
    }
  },

  selectCandidate(event) {
    const { candidateId } = event.currentTarget.dataset;
    const { record } = this.data;
    if (!record || !candidateId) return;
    const selectedCandidate = (record.candidates || []).find((candidate) => candidate.candidateId === candidateId);
    if (!selectedCandidate) return;
    this.setData({
      selectedCandidateId: candidateId,
      record: {
        ...record,
        displayUrl: selectedCandidate.imageUrl
      }
    });
  },

  async savePreview() {
    const { record } = this.data;
    await saveImageFromUrl(record && record.previewUrl, {
      loadingText: '正在保存预览图',
      successText: '预览图已保存到相册'
    });
  },

  async saveHd() {
    const { record } = this.data;
    await saveImageFromUrl(record && (record.hdUrl || record.resultUrl || record.previewUrl), {
      loadingText: '正在保存高清图',
      successText: '高清图已保存到相册'
    });
  },

  async saveLayout() {
    const { record } = this.data;
    await saveImageFromUrl(record && record.printLayoutUrl, {
      emptyText: '这条历史记录里还没有排版图',
      loadingText: '正在保存排版图',
      successText: '排版图已保存到相册'
    });
  },

  remake() {
    const { record, selectedCandidateId } = this.data;
    if (!record) return;
    const draft = normalizeHistoryRecordToEditDraft(record, { selectedCandidateId });
    setFlowDraft(draft);
    wx.navigateTo({ url: '/pages/editor/editor' });
  },

  handleDelete() {
    // TODO(server): 历史删除接口接入后，替换为真实 delete task 调用。
    wx.showToast({ title: '删除能力建设中', icon: 'none' });
  }
});
