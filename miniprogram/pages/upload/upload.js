const { SCENE_TEMPLATES } = require('../../utils/constants');
const { getFlowDraft, setFlowDraft } = require('../../utils/flow-draft');

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

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
    autoStartCamera: false
  },

  onLoad(options) {
    const draft = getFlowDraft();
    const sceneInfo = resolveSceneInfo(options, draft);
    const autoStartCamera = options.autostartCamera === '1';

    this.setData({
      sceneInfo,
      imagePath: draft.sourceImagePath || '',
      autoStartCamera
    });

    if (sceneInfo) {
      setFlowDraft({ selectedScene: sceneInfo });
    }
  },

  onShow() {
    if (this.data.autoStartCamera) {
      this.setData({ autoStartCamera: false });
      this.tryOpenCameraWithPermission();
    }
  },

  chooseFromCamera() {
    this.tryOpenCameraWithPermission();
  },

  chooseFromAlbum() {
    this.pickImage(['album']);
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
      content: '未获得相机权限，无法直接拍摄。你可以前往设置开启权限或改用相册上传。',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting({});
        }
      }
    });
  },

  pickImage(sourceType) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType,
      success: (res) => {
        const file = (res.tempFiles && res.tempFiles[0]) || {};
        if (!file.tempFilePath) {
          wx.showToast({ title: '未获取到图片，请重试', icon: 'none' });
          return;
        }
        if (file.size && file.size > MAX_IMAGE_SIZE) {
          wx.showToast({ title: '图片过大，请选择 15MB 内图片', icon: 'none' });
          return;
        }

        this.setData({ imagePath: file.tempFilePath });
        setFlowDraft({
          sourceImagePath: file.tempFilePath,
          sourceImageUrl: file.tempFilePath,
          flowType: 'idPhoto',
          selectedScene: this.data.sceneInfo || null
        });
      }
    });
  },

  nextStep() {
    if (!this.data.imagePath) {
      wx.showToast({ title: '请先上传照片', icon: 'none' });
      return;
    }
    setFlowDraft({
      sourceImagePath: this.data.imagePath,
      sourceImageUrl: this.data.imagePath,
      selectedScene: this.data.sceneInfo || null
    });
    wx.navigateTo({ url: '/pages/custom-size/custom-size' });
  }
});
