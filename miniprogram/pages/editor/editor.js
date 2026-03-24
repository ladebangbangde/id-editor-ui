const { getColorLabel, formatTime } = require('../../utils/format');
const { getFriendlySceneName, getFriendlySizeText } = require('../../utils/photo-display');
const { processPhoto, getPhotoTask } = require('../../utils/api');
const storage = require('../../utils/storage');
const { STORAGE_KEYS } = require('../../utils/constants');
const { getFlowDraft, setFlowDraft } = require('../../utils/flow-draft');
const { toCanonicalSizeCode } = require('../../utils/size-codes');

function normalizeWarnings(warnings) {
  return Array.isArray(warnings) ? warnings.filter(Boolean) : [];
}

Page({
  data: {
    draft: {},
    selectedColor: 'white',
    formalWearOption: 'none',
    generating: false
  },

  onShow() {
    const draft = getFlowDraft();
    const selectedColor = draft.backgroundColor || 'white';
    const formalWearOption = draft.formalWearOption || 'none';
    this.setData({ draft, selectedColor, formalWearOption });
  },

  onColorChange(event) {
    const selectedColor = event.detail.value;
    this.setData({ selectedColor });
    setFlowDraft({ backgroundColor: selectedColor });
  },

  onFormalWearChange(event) {
    const { value } = event.currentTarget.dataset;
    if (!value) return;
    this.setData({ formalWearOption: value });
    setFlowDraft({ formalWearOption: value, flowType: value === 'none' ? 'idPhoto' : 'formalWear' });
  },

  goSelectSize() {
    wx.navigateTo({ url: '/pages/custom-size/custom-size' });
  },

  async refreshTaskResult(taskId, fallbackResult = {}) {
    if (!taskId) return fallbackResult;
    try {
      const latest = await getPhotoTask(taskId);
      if (latest && (latest.previewUrl || latest.resultUrl)) return latest;
    } catch (error) {
      // ignore refresh failure
    }
    return fallbackResult;
  },

  async handleGenerate() {
    const { generating, selectedColor, formalWearOption, draft } = this.data;
    if (generating) return;
    if (!draft.sourceImagePath) {
      wx.showToast({ title: '请先上传原图', icon: 'none' });
      return;
    }
    if (!draft.selectedScene) {
      wx.showToast({ title: '请先选择尺寸', icon: 'none' });
      return;
    }

    this.setData({ generating: true });
    setFlowDraft({
      backgroundColor: selectedColor,
      formalWearOption,
      flowType: formalWearOption === 'none' ? 'idPhoto' : 'formalWear'
    });

    try {
      const canonicalSizeCode = toCanonicalSizeCode(draft.selectedSizeCode || draft.selectedScene.sceneKey)
        || (draft.selectedSizeCode === 'custom' ? 'one_inch' : '');
      if (!canonicalSizeCode) {
        wx.showToast({ title: '当前尺寸暂不支持，请更换尺寸', icon: 'none' });
        return;
      }
      if (draft.selectedSizeCode === 'custom') {
        // TODO(server): 服务端支持完全自定义尺寸后，改为透传 customSize 生成而非一寸兜底。
        wx.showToast({ title: '当前先按一寸规格生成', icon: 'none' });
      }
      // TODO(server): 待后端支持统一的“证件照+换装”处理接口后，这里按 formalWearOption 调用对应生成能力。
      const processed = await processPhoto(draft.sourceImagePath, {
        sizeCode: canonicalSizeCode,
        backgroundColor: selectedColor,
        enhance: false
      });
      const latestResult = await this.refreshTaskResult(processed.taskId, processed);
      const sceneInfo = draft.selectedScene || {};
      const result = {
        imagePath: draft.sourceImagePath,
        sourceImagePath: draft.sourceImagePath,
        sourceImageUrl: draft.sourceImageUrl || draft.sourceImagePath,
        sceneInfo,
        sceneName: getFriendlySceneName({ sceneKey: sceneInfo.sceneKey, sceneName: sceneInfo.sceneName }, '证件照'),
        sizeText: getFriendlySizeText(sceneInfo),
        taskId: latestResult.taskId || processed.taskId || '',
        status: latestResult.status || processed.status || '',
        previewUrl: latestResult.previewUrl || processed.previewUrl || '',
        resultUrl: latestResult.resultUrl || processed.resultUrl || '',
        backgroundColor: latestResult.backgroundColor || processed.backgroundColor || selectedColor,
        backgroundColorLabel: getColorLabel(latestResult.backgroundColor || processed.backgroundColor || selectedColor),
        sizeCode: latestResult.sizeCode || processed.sizeCode || canonicalSizeCode,
        width: latestResult.width || processed.width || sceneInfo.pixelWidth || 0,
        height: latestResult.height || processed.height || sceneInfo.pixelHeight || 0,
        warnings: normalizeWarnings(latestResult.warnings || processed.warnings),
        qualityStatus: latestResult.qualityStatus || processed.qualityStatus || '',
        qualityMessage: latestResult.qualityMessage || processed.qualityMessage || '',
        createdAt: latestResult.createdAt || formatTime(Date.now()),
        hdUrl: latestResult.hdUrl || processed.hdUrl || latestResult.resultUrl || processed.resultUrl || '',
        formalWearOption
      };
      storage.set(STORAGE_KEYS.CURRENT_RESULT, result);
      wx.navigateTo({ url: '/pages/result/result' });
    } catch (error) {
      wx.showToast({ title: error.message || '生成失败，请重试', icon: 'none' });
    } finally {
      this.setData({ generating: false });
    }
  }
});
