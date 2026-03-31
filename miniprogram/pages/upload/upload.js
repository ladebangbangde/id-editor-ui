const { SCENE_TEMPLATES } = require('../../utils/constants');
const { getFlowDraft, setFlowDraft } = require('../../utils/flow-draft');
const { toCanonicalSizeCode, buildSceneBySizeCode } = require('../../utils/size-codes');
const { preprocessUploadImage } = require('../../utils/image-preprocess');


function resolveSceneInfo(options = {}, draft = {}) {
  if (draft.selectedScene) {
    return draft.selectedScene;
  }
  if (!options.sceneKey) {
    return null;
  }
  const matched = SCENE_TEMPLATES.find((item) => item.sceneKey === options.sceneKey);
  if (matched) return matched;
  return {
    sceneKey: options.sceneKey,
    sceneName: options.sceneName ? decodeURIComponent(options.sceneName) : '证件照'
  };
}

Page({
  data: {
    sceneInfo: null,
    imagePath: '',
    flowMode: 'free',
    needSelectSize: true,
    selectedSizeCode: '',
    // 避免短时间重复点击导致 chooseMedia 被调用两次，出现“二次弹窗”。
    isPickingImage: false,
    cameraOnly: false,
    nextStepLocked: false
  },

  onLoad(options) {
    const draft = getFlowDraft();
    const sceneInfo = resolveSceneInfo(options, draft);
    const flowMode = options.flowMode || draft.flowMode || 'free';
    const needSelectSize = options.needSelectSize
      ? options.needSelectSize !== '0'
      : (typeof draft.needSelectSize === 'boolean' ? draft.needSelectSize : true);
    const selectedSizeCode = toCanonicalSizeCode(options.selectedSizeCode || draft.selectedSizeCode || (sceneInfo && sceneInfo.sceneKey)) || '';
    const canonicalScene = buildSceneBySizeCode(selectedSizeCode);

    const cameraOnly = options.cameraOnly === '1' || options.entry === 'camera';

    this.setData({
      sceneInfo: canonicalScene || sceneInfo,
      imagePath: draft.sourceImagePath || '',
      flowMode,
      needSelectSize,
      selectedSizeCode,
      cameraOnly
    });

    setFlowDraft({
      flowMode,
      needSelectSize,
      selectedSizeCode,
      selectedScene: canonicalScene || sceneInfo || null
    });

    if (options.entry === 'camera') {
      wx.nextTick(() => {
        this.tryOpenCameraWithPermission();
      });
    }
  },

  chooseFromCamera() {
    this.handleSelectPhoto(['camera']);
  },

  chooseFromAlbum() {
    this.handleSelectPhoto(['album']);
  },

  handleSelectPhoto(sourceType = ['album']) {
    if (this.data.isPickingImage) return;
    if (sourceType.includes('camera')) {
      this.tryOpenCameraWithPermission();
      return;
    }
    this.pickImage(sourceType);
  },

  tryOpenCameraWithPermission() {
    wx.showModal({
      title: '拍照权限说明',
      content: '用于拍摄证件照原图，我们只会在你确认后使用该照片进行处理。',
      confirmText: '继续',
      success: (modalRes) => {
        if (!modalRes.confirm) return;
        wx.getSetting({
          success: (settingRes) => {
            const cameraAuth = settingRes.authSetting && settingRes.authSetting['scope.camera'];
            if (cameraAuth === false) {
              this.promptOpenSetting();
              return;
            }
            if (cameraAuth === true) {
              this.pickImage(['camera']);
              return;
            }
            wx.authorize({
              scope: 'scope.camera',
              success: () => this.pickImage(['camera']),
              fail: () => this.promptOpenSetting()
            });
          },
          fail: () => this.pickImage(['camera'])
        });
      }
    });
  },

  promptOpenSetting() {
    wx.showModal({
      title: '需要相机权限',
      content: '未获得相机权限，暂时无法拍摄证件照。请在设置中开启相机权限后重试。',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting({});
        }
      }
    });
  },

  pickImage(sourceType) {
    if (this.data.isPickingImage) return;
    this.setData({ isPickingImage: true });
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType,
      success: async (res) => {
        const file = (res.tempFiles && res.tempFiles[0]) || {};
        if (!file.tempFilePath) {
          wx.showToast({ title: '未获取到图片，请重试', icon: 'none' });
          return;
        }

        try {
          const processed = await preprocessUploadImage(file);
          this.setData({ imagePath: processed.filePath });
          if (processed.compressed) {
            wx.showToast({ title: '已自动优化图片体积', icon: 'none' });
          }
          setFlowDraft({
            sourceImagePath: processed.filePath,
            sourceImageUrl: processed.filePath,
            flowType: 'idPhoto',
            flowMode: this.data.flowMode,
            needSelectSize: this.data.needSelectSize,
            selectedSizeCode: this.data.selectedSizeCode || '',
            selectedScene: this.data.sceneInfo || null
          });
        } catch (error) {
          wx.showToast({ title: error.message || '图片处理失败，请换一张试试', icon: 'none' });
        }
      },
      fail: () => {
        // 用户取消选择时不弹错误提示，避免打断操作。
      },
      complete: () => {
        // 无论成功/失败都释放锁，保证下一次点击可正常触发。
        this.setData({ isPickingImage: false });
      }
    });
  },

  nextStep() {
    if (this.data.nextStepLocked) return;
    if (!this.data.imagePath) {
      wx.showToast({ title: '请先上传照片', icon: 'none' });
      return;
    }
    this.setData({ nextStepLocked: true });
    setFlowDraft({
      sourceImagePath: this.data.imagePath,
      sourceImageUrl: this.data.imagePath,
      flowMode: this.data.flowMode,
      needSelectSize: this.data.needSelectSize,
      selectedSizeCode: this.data.selectedSizeCode || '',
      selectedScene: this.data.sceneInfo || null
    });
    if (this.data.needSelectSize) {
      wx.navigateTo({ url: '/pages/custom-size/custom-size' });
      setTimeout(() => this.setData({ nextStepLocked: false }), 500);
      return;
    }
    wx.navigateTo({ url: '/pages/editor/editor' });
    setTimeout(() => this.setData({ nextStepLocked: false }), 500);
  }
});
