const { STORAGE_KEYS } = require('../../utils/constants');
const { getColorLabel, formatTime } = require('../../utils/format');
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

const SIZE_NAME_MAP = {
  one_inch: '标准一寸',
  small_one_inch: '小一寸',
  two_inch: '二寸'
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
    unsupportedMessage: ''
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
      sizeCode
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
        unsupportedMessage: `服务端暂不支持 ${SIZE_NAME_MAP[sizeCode] || sceneInfo.sceneName || '当前尺寸'}。`
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
        sceneName: sceneInfo.sceneName || SIZE_NAME_MAP[sizeCode] || '证件照',
        sizeText: `${sceneInfo.widthMm || '--'}×${sceneInfo.heightMm || '--'}mm`,
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
        fileDesc: '预览图与高清图由新处理链路直接返回'
      };

      storage.set(STORAGE_KEYS.CURRENT_UPLOAD, {
        imagePath,
        sceneInfo
      });
      storage.set(STORAGE_KEYS.CURRENT_RESULT, result);
      wx.navigateTo({ url: '/pages/result/result' });
    } catch (error) {
      wx.showToast({ title: error.message || error.msg || error.errMsg || '生成失败，请重试', icon: 'none' });
    } finally {
      this.setData({ generating: false });
    }
  }
});
