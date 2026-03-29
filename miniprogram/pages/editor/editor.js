const { processPhoto } = require('../../utils/api');
const { getFlowDraft, setFlowDraft } = require('../../utils/flow-draft');
const { toCanonicalSizeCode } = require('../../utils/size-codes');
const storage = require('../../utils/storage');
const { STORAGE_KEYS } = require('../../utils/constants');

const ALLOWED_BACKGROUND_COLORS = ['blue', 'white', 'red'];

function normalizeBackgroundColor(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const lowered = raw.toLowerCase();
  if (ALLOWED_BACKGROUND_COLORS.includes(lowered)) return lowered;
  if (raw === '白色') return 'white';
  if (raw === '蓝色') return 'blue';
  if (raw === '红色') return 'red';
  return '';
}

Page({
  data: {
    draft: {},
    selectedColor: 'white',
    generating: false
  },

  onShow() {
    const draft = getFlowDraft();
    const selectedColor = draft.backgroundColor || 'white';
    this.setData({ draft, selectedColor });
  },

  onColorChange(event) {
    const selectedColor = event.detail.value;
    this.setData({ selectedColor });
    setFlowDraft({ backgroundColor: selectedColor });
  },

  goSelectSize() {
    wx.navigateTo({ url: '/pages/custom-size/custom-size' });
  },

  async handleGenerate() {
    const { generating, selectedColor, draft } = this.data;
    if (generating) return;
    if (!draft.sourceImagePath) {
      wx.showToast({ title: '请先上传原图', icon: 'none' });
      return;
    }
    if (!draft.selectedScene) {
      wx.showToast({ title: '请先选择尺寸', icon: 'none' });
      return;
    }

    const normalizedBackgroundColor = normalizeBackgroundColor(selectedColor || draft.backgroundColor);
    if (!normalizedBackgroundColor) {
      wx.showToast({ title: '背景色参数不合法，请重新选择', icon: 'none' });
      return;
    }

    this.setData({ generating: true });
    setFlowDraft({
      backgroundColor: normalizedBackgroundColor,
      flowType: 'idPhoto'
    });

    try {
      const selectedSizeCode = draft.selectedSizeCode || (draft.selectedScene && draft.selectedScene.sceneKey) || '';
      const canonicalSizeCode = toCanonicalSizeCode(selectedSizeCode)
        || (draft.selectedSizeCode === 'custom' ? 'one_inch' : '');
      if (!canonicalSizeCode) {
        wx.showToast({ title: '当前尺寸暂不支持，请更换尺寸', icon: 'none' });
        return;
      }
      if (draft.selectedSizeCode === 'custom') {
        wx.showToast({ title: '当前先按一寸规格生成', icon: 'none' });
      }

      const processed = await processPhoto(draft.sourceImagePath, {
        sizeCode: canonicalSizeCode,
        backgroundColor: normalizedBackgroundColor,
        enhance: false
      }, {
        showLoading: false
      });

      const taskId = processed.taskId || '';
      const progressContext = {
        taskId,
        sourceImagePath: draft.sourceImagePath,
        sourceImageUrl: draft.sourceImageUrl || draft.sourceImagePath,
        sceneInfo: draft.selectedScene || {},
        sceneName: (draft.selectedScene && draft.selectedScene.sceneName) || '证件照',
        sizeText: (draft.selectedScene && draft.selectedScene.widthMm && draft.selectedScene.heightMm)
          ? `${draft.selectedScene.widthMm}×${draft.selectedScene.heightMm}mm`
          : '',
        backgroundColor: normalizedBackgroundColor,
        sizeCode: canonicalSizeCode,
        createdAt: processed.createdAt || ''
      };
      storage.set(STORAGE_KEYS.CURRENT_PROGRESS_CONTEXT, progressContext);
      wx.navigateTo({
        url: `/pages/photo-progress/index?taskId=${encodeURIComponent(taskId)}&sceneName=${encodeURIComponent(progressContext.sceneName)}`
      });
    } catch (error) {
      wx.showToast({ title: error.message || '生成失败，请重试', icon: 'none' });
    } finally {
      this.setData({ generating: false });
    }
  }
});
