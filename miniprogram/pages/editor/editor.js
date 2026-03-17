const { STORAGE_KEYS } = require('../../utils/constants');
const { getColorLabel, formatTime } = require('../../utils/format');
const { uploadImage, generateImage, getTask } = require('../../utils/api');
const storage = require('../../utils/storage');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Page({
  data: {
    sceneInfo: {},
    imagePath: '',
    imageId: '',
    selectedColor: 'white',
    generating: false
  },

  onLoad() {
    const uploadData = storage.get(STORAGE_KEYS.CURRENT_UPLOAD, {});
    const currentScene = storage.get(STORAGE_KEYS.CURRENT_SCENE, {});
    const sceneInfo = uploadData.sceneInfo || currentScene.scene || {};
    this.setData({
      sceneInfo,
      imagePath: uploadData.imagePath || '',
      imageId: uploadData.imageId || '',
      selectedColor: currentScene.color || 'white'
    });
  },

  onColorChange(event) {
    this.setData({ selectedColor: event.detail.value });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  async ensureUploadedImage() {
    if (this.data.imageId) return this.data.imageId;
    const uploadData = await uploadImage(this.data.imagePath);
    const imageId = uploadData.imageId;
    if (!imageId) throw new Error('未获取到 imageId');

    storage.set(STORAGE_KEYS.CURRENT_UPLOAD, {
      imagePath: this.data.imagePath,
      sceneInfo: this.data.sceneInfo,
      imageId
    });
    this.setData({ imageId });
    return imageId;
  },

  async pollTask(taskId) {
    if (!taskId) return null;
    for (let i = 0; i < 8; i += 1) {
      const task = await getTask(taskId);
      if (task.status === 'success' || task.status === 'failed') {
        return task;
      }
      await sleep(1000);
    }
    return null;
  },

  async handleGenerate() {
    if (!this.data.imagePath) {
      wx.showToast({ title: '请先上传照片', icon: 'none' });
      return;
    }

    this.setData({ generating: true });
    try {
      const imageId = await this.ensureUploadedImage();
      const sourceType = this.data.sceneInfo.sceneKey === 'custom' ? 'custom' : 'scene';
      const payload = {
        imageId,
        sourceType,
        backgroundColor: this.data.selectedColor
      };

      if (sourceType === 'scene') {
        payload.sceneKey = this.data.sceneInfo.sceneKey;
      } else {
        payload.customWidthMm = Number(this.data.sceneInfo.widthMm);
        payload.customHeightMm = Number(this.data.sceneInfo.heightMm);
      }

      const generated = await generateImage(payload);
      const task = await this.pollTask(generated.taskId);
      if (task && task.status === 'failed') {
        throw new Error(task.errorMessage || '任务处理失败');
      }

      const result = {
        imageId,
        resultId: generated.resultId,
        taskId: generated.taskId,
        previewUrl: generated.previewUrl,
        layoutUrl: generated.printLayoutUrl || generated.layoutUrl || generated.previewUrl,
        sceneName: this.data.sceneInfo.sceneName || '自定义尺寸',
        sizeText: `${this.data.sceneInfo.widthMm || '--'}×${this.data.sceneInfo.heightMm || '--'}mm`,
        backgroundColor: getColorLabel(this.data.selectedColor),
        sourceImage: this.data.imagePath,
        createdAt: formatTime(Date.now()),
        status: generated.status || (task && task.status) || 'processing',
        fileDesc: '可下载预览图 / 高清图 / 排版图'
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
