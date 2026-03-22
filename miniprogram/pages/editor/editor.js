const { STORAGE_KEYS } = require('../../utils/constants');
const { getColorLabel, formatTime } = require('../../utils/format');
const { getFriendlySceneName, getFriendlySizeText } = require('../../utils/photo-display');
const { getPhotoSpecs, processPhoto, getPhotoTask } = require('../../utils/api');
const storage = require('../../utils/storage');

const SIZE_CODE_MAP = {
  one_inch: 'one_inch',
  one_inch_general: 'one_inch',
  resume: 'one_inch',
  resume_photo: 'one_inch',
  small_one_inch: 'small_one_inch',
  driving_license: 'small_one_inch',
  two_inch: 'two_inch',
  two_inch_general: 'two_inch'
};

const SIZE_BY_MM = {
  '25x35': 'one_inch',
  '22x32': 'small_one_inch',
  '35x49': 'two_inch'
};

function buildSizeKey(sceneInfo = {}) {
  const widthMm = Number(sceneInfo.widthMm || 0);
  const heightMm = Number(sceneInfo.heightMm || 0);
  if (!widthMm || !heightMm) return '';
  return `${widthMm}x${heightMm}`;
}

function mapSceneToSizeCode(sceneInfo = {}) {
  const sceneKey = sceneInfo.sceneKey || '';
  return SIZE_CODE_MAP[sceneKey] || SIZE_BY_MM[buildSizeKey(sceneInfo)] || '';
}

function normalizeWarnings(warnings) {
  return Array.isArray(warnings) ? warnings.filter(Boolean) : [];
}

function normalizeFailureDetail(error = {}) {
  return {
    message: error.message || error.msg || '照片检测未通过，请按提示调整后重试',
    code: error.code || '',
    taskId: error.taskId || (error.data && error.data.taskId) || '',
    reasons: Array.isArray(error.reasons) ? error.reasons.filter(Boolean) : [],
    suggestions: Array.isArray(error.suggestions) ? error.suggestions.filter(Boolean) : []
  };
}

Page({
  data: {
    sceneInfo: {},
    imagePath: '',
    selectedColor: 'white',
    generating: false,
    specs: {
      backgroundColors: [],
      sizeCodes: []
    },
    sizeCode: '',
    unsupportedMessage: '',
    displaySceneName: '证件照'
  },

  async onLoad() {
    const uploadData = storage.get(STORAGE_KEYS.CURRENT_UPLOAD, {});
    const currentScene = storage.get(STORAGE_KEYS.CURRENT_SCENE, {});
    const sceneInfo = uploadData.sceneInfo || currentScene.scene || {};
    const selectedColor = currentScene.color || 'white';
    const sizeCode = mapSceneToSizeCode(sceneInfo);

    this.setData({
      sceneInfo,
      imagePath: uploadData.imagePath || '',
      selectedColor,
      sizeCode,
      displaySceneName: getFriendlySceneName({ sceneKey: sceneInfo.sceneKey, sizeCode, sceneName: sceneInfo.sceneName }, '证件照')
    });

    this.updateUnsupportedMessage({
      sceneInfo,
      sizeCode,
      specs: this.data.specs
    });

    try {
      const specs = await getPhotoSpecs();
      this.setData({ specs });
      this.updateUnsupportedMessage({
        sceneInfo,
        sizeCode,
        specs
      });
    } catch (error) {
      // ignore, editor can still fallback to local mapping
    }
  },

  updateUnsupportedMessage({
    sceneInfo = this.data.sceneInfo,
    sizeCode = this.data.sizeCode,
    specs = this.data.specs
  } = {}) {
    if (!sizeCode) {
      this.setData({
        unsupportedMessage: '当前场景暂未接入新处理链路，请改用标准一寸、小一寸或二寸模板。'
      });
      return;
    }

    if (Array.isArray(specs.sizeCodes) && specs.sizeCodes.length && !specs.sizeCodes.includes(sizeCode)) {
      this.setData({
        unsupportedMessage: `暂时还不能直接生成${getFriendlySceneName({ sizeCode, sceneName: sceneInfo.sceneName }, '当前照片')}，可以先试试一寸、小一寸或二寸。`
      });
      return;
    }

    this.setData({ unsupportedMessage: '' });
  },

  onColorChange(event) {
    this.setData({ selectedColor: event.detail.value });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  openProcessFailurePage(error = {}) {
    storage.set(STORAGE_KEYS.CURRENT_PROCESS_FAILURE, {
      ...normalizeFailureDetail(error),
      imagePath: this.data.imagePath,
      sceneInfo: this.data.sceneInfo,
      selectedColor: this.data.selectedColor,
      sizeCode: this.data.sizeCode,
      createdAt: formatTime(Date.now())
    });

    wx.navigateTo({ url: '/pages/process-failure/process-failure' });
  },

  async refreshTaskResult(taskId, fallbackResult = {}) {
    if (!taskId) {
      return fallbackResult;
    }

    try {
      const latest = await getPhotoTask(taskId);
      if (latest && (latest.previewUrl || latest.resultUrl)) {
        return latest;
      }
    } catch (error) {
      // keep synchronous process result as fallback
    }

    return fallbackResult;
  },

  async handleGenerate() {
    const {
      imagePath,
      selectedColor,
      sceneInfo,
      generating,
      unsupportedMessage,
      sizeCode,
      specs
    } = this.data;

    if (!imagePath) {
      wx.showToast({ title: '请先上传照片', icon: 'none' });
      return;
    }

    if (unsupportedMessage) {
      wx.showToast({ title: unsupportedMessage, icon: 'none' });
      return;
    }

    if (generating) {
      return;
    }

    if (Array.isArray(specs.backgroundColors) && specs.backgroundColors.length
      && !specs.backgroundColors.includes(selectedColor)) {
      wx.showToast({ title: '当前底色暂不受服务端支持', icon: 'none' });
      return;
    }

    this.setData({ generating: true });

    try {
      const processed = await processPhoto(imagePath, {
        sizeCode,
        backgroundColor: selectedColor,
        enhance: false
      });
      const latestResult = await this.refreshTaskResult(processed.taskId, processed);

      const result = {
        imagePath,
        sceneInfo,
        sceneName: getFriendlySceneName({ sceneKey: sceneInfo.sceneKey, sizeCode, sceneName: sceneInfo.sceneName }, '证件照'),
        sizeText: getFriendlySizeText({ ...sceneInfo, sizeCode }),
        taskId: latestResult.taskId || processed.taskId || '',
        status: latestResult.status || processed.status || '',
        previewUrl: latestResult.previewUrl || processed.previewUrl || '',
        resultUrl: latestResult.resultUrl || processed.resultUrl || '',
        backgroundColor: latestResult.backgroundColor || processed.backgroundColor || selectedColor,
        backgroundColorLabel: getColorLabel(
          latestResult.backgroundColor || processed.backgroundColor || selectedColor
        ),
        sizeCode: latestResult.sizeCode || processed.sizeCode || sizeCode,
        width: latestResult.width || processed.width || sceneInfo.pixelWidth || 0,
        height: latestResult.height || processed.height || sceneInfo.pixelHeight || 0,
        warnings: normalizeWarnings(latestResult.warnings || processed.warnings),
        qualityStatus: latestResult.qualityStatus || processed.qualityStatus || '',
        qualityMessage: latestResult.qualityMessage || processed.qualityMessage || '',
        createdAt: latestResult.createdAt || formatTime(Date.now()),
        hdUrl: latestResult.hdUrl || processed.hdUrl || latestResult.resultUrl || processed.resultUrl || '',
        layoutUrl: latestResult.layoutUrl || processed.layoutUrl || latestResult.printLayoutUrl || processed.printLayoutUrl || '',
        printLayoutUrl: latestResult.printLayoutUrl || processed.printLayoutUrl || latestResult.layoutUrl || processed.layoutUrl || '',
        fileDesc: '预览图、高清图会直接返回；如果有排版图，也会一起带上'
      };

      storage.set(STORAGE_KEYS.CURRENT_UPLOAD, {
        imagePath,
        sceneInfo
      });
      storage.set(STORAGE_KEYS.CURRENT_RESULT, result);
      storage.remove(STORAGE_KEYS.CURRENT_PROCESS_FAILURE);
      wx.navigateTo({ url: '/pages/result/result' });
    } catch (error) {
      if (error && (error.reasons || error.suggestions || error.taskId || error.code)) {
        this.openProcessFailurePage(error);
        return;
      }
      wx.showToast({ title: error.message || error.msg || error.errMsg || '生成失败，请重试', icon: 'none' });
    } finally {
      this.setData({ generating: false });
    }
  }
});
