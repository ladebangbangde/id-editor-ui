const { SIZE_OPTIONS, COLOR_OPTIONS, PAGE_TEXT } = require('../../utils/constants');
const { uploadImage, generateIdPhoto, getScenes, getTask, getSceneDetail } = require('../../utils/api');
const storage = require('../../utils/storage');

const MAX_TASK_POLL = 20;
const TASK_POLL_INTERVAL = 1200;

Page({
  data: {
    pageText: PAGE_TEXT,
    sizeOptions: [],
    colorOptions: COLOR_OPTIONS,
    selectedSize: '',
    selectedColor: COLOR_OPTIONS[0].value,
    localImagePath: '',
    uploadedImageId: '',
    uploadedOriginalUrl: '',
    generating: false
  },

  onLoad() {
    this.loadScenes();
  },

  onShow() {
    const remakeOption = storage.get('remake_option');
    if (remakeOption) {
      this.setData({
        selectedSize: remakeOption.sizeType || this.data.selectedSize,
        selectedColor: remakeOption.backgroundColor || this.data.selectedColor
      });
      storage.remove('remake_option');
    }
  },

  async loadScenes() {
    try {
      const res = await getScenes();
      const scenes = (res.data || []).map((item) => ({
        label: item.name || item.sceneKey,
        value: item.sceneKey
      }));

      if (scenes.length) {
        this.setData({
          sizeOptions: scenes,
          selectedSize: this.data.selectedSize || scenes[0].value
        });
        return;
      }
      throw new Error('Empty scenes');
    } catch (error) {
      this.setData({
        sizeOptions: SIZE_OPTIONS,
        selectedSize: this.data.selectedSize || SIZE_OPTIONS[0].value
      });
      wx.showToast({ title: 'Load scenes failed, fallback to local presets.', icon: 'none' });
    }
  },

  onSizeChange(event) {
    this.setData({ selectedSize: event.detail.value });
    this.prefetchSceneDetail(event.detail.value);
  },

  onColorChange(event) {
    this.setData({ selectedColor: event.detail.value });
  },

  async prefetchSceneDetail(sceneKey) {
    if (!sceneKey) return;
    try {
      await getSceneDetail(sceneKey);
    } catch (error) {
      // Scene detail is optional for UI display; ignore quietly.
    }
  },

  handleChooseImage() {
    wx.showActionSheet({
      itemList: ['Take Photo', 'Choose from Album'],
      success: (res) => {
        const sourceType = res.tapIndex === 0 ? ['camera'] : ['album'];
        this.pickImage(sourceType);
      }
    });
  },

  pickImage(sourceType) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType,
      sizeType: ['compressed'],
      success: (res) => {
        const file = (res.tempFiles && res.tempFiles[0]) || {};
        this.setData({
          localImagePath: file.tempFilePath || '',
          uploadedImageId: '',
          uploadedOriginalUrl: ''
        });
      },
      fail: () => {
        wx.showToast({ title: 'Image selection canceled', icon: 'none' });
      }
    });
  },

  async ensureUploaded() {
    if (this.data.uploadedImageId) {
      return {
        imageId: this.data.uploadedImageId,
        originalUrl: this.data.uploadedOriginalUrl
      };
    }

    if (!this.data.localImagePath) {
      throw new Error('Please upload a selfie first.');
    }

    const uploadRes = await uploadImage(this.data.localImagePath);
    const uploadData = uploadRes.data || {};
    this.setData({
      uploadedImageId: uploadData.imageId || '',
      uploadedOriginalUrl: uploadData.originalUrl || this.data.localImagePath
    });

    return {
      imageId: uploadData.imageId,
      originalUrl: uploadData.originalUrl || this.data.localImagePath
    };
  },

  async waitTaskDone(taskId) {
    if (!taskId) return { status: 'unknown' };

    for (let i = 0; i < MAX_TASK_POLL; i += 1) {
      const taskRes = await getTask(taskId);
      const taskData = taskRes.data || {};
      if (taskData.status === 'success' || taskData.status === 'failed') {
        return taskData;
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, TASK_POLL_INTERVAL));
    }

    return { status: 'timeout' };
  },

  async handleGenerate() {
    if (!this.data.localImagePath) {
      wx.showToast({ title: 'Please upload a selfie first.', icon: 'none' });
      return;
    }

    if (!this.data.selectedSize) {
      wx.showToast({ title: 'Please select a scene template', icon: 'none' });
      return;
    }

    if (this.data.generating) {
      return;
    }

    this.setData({ generating: true });

    try {
      const uploadResult = await this.ensureUploaded();
      const payload = {
        imageId: uploadResult.imageId,
        sourceType: 'scene',
        sceneKey: this.data.selectedSize,
        backgroundColor: this.data.selectedColor,
        beautyEnabled: false,
        printLayoutType: 'none'
      };

      const generateRes = await generateIdPhoto(payload);
      const resultData = generateRes.data || {};
      let taskData = {};
      if (resultData.taskId) {
        taskData = await this.waitTaskDone(resultData.taskId);
        if (taskData.status === 'failed') {
          throw new Error(taskData.message || 'Generate task failed');
        }
        if (taskData.status === 'timeout') {
          throw new Error('Generate timeout, please check task status in history page.');
        }
      }

      const routePayload = {
        imageId: uploadResult.imageId,
        resultId: resultData.resultId || '',
        taskId: resultData.taskId || '',
        originalUrl: uploadResult.originalUrl,
        previewUrl: resultData.previewUrl || '',
        hdUrl: resultData.hdUrl || '',
        printLayoutUrl: resultData.printLayoutUrl || '',
        sizeType: this.data.selectedSize,
        backgroundColor: this.data.selectedColor,
        status: taskData.status || resultData.status || 'success',
        paid: false
      };

      storage.setLastResult(routePayload);
      wx.navigateTo({
        url: `/pages/result/result?imageId=${routePayload.imageId}&resultId=${routePayload.resultId}`
      });
    } catch (error) {
      const message = error.message || error.msg || 'Generate failed, please retry.';
      wx.showToast({ title: message, icon: 'none' });
    } finally {
      this.setData({ generating: false });
    }
  }
});
