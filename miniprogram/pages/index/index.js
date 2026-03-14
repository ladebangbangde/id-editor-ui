const { SIZE_OPTIONS, COLOR_OPTIONS, PAGE_TEXT } = require('../../utils/constants');
const { uploadImage, generateIdPhoto } = require('../../utils/api');
const storage = require('../../utils/storage');

Page({

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

  data: {
    pageText: PAGE_TEXT,
    sizeOptions: SIZE_OPTIONS,
    colorOptions: COLOR_OPTIONS,
    selectedSize: SIZE_OPTIONS[0].value,
    selectedColor: COLOR_OPTIONS[0].value,
    localImagePath: '',
    uploadedImageId: '',
    uploadedOriginalUrl: '',
    generating: false
  },

  onSizeChange(event) {
    this.setData({ selectedSize: event.detail.value });
  },

  onColorChange(event) {
    this.setData({ selectedColor: event.detail.value });
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

  async handleGenerate() {
    if (!this.data.localImagePath) {
      wx.showToast({ title: 'Please upload a selfie first.', icon: 'none' });
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
        sizeType: this.data.selectedSize,
        backgroundColor: this.data.selectedColor
      };

      const generateRes = await generateIdPhoto(payload);
      const resultData = generateRes.data || {};
      const routePayload = {
        imageId: resultData.imageId || uploadResult.imageId,
        originalUrl: uploadResult.originalUrl,
        previewUrl: resultData.previewUrl || '',
        hdUrl: resultData.hdUrl || '',
        printLayoutUrl: resultData.printLayoutUrl || '',
        sizeType: resultData.sizeType || this.data.selectedSize,
        backgroundColor: resultData.backgroundColor || this.data.selectedColor,
        paid: Boolean(resultData.paid)
      };

      storage.setLastResult(routePayload);
      wx.navigateTo({
        url: `/pages/result/result?imageId=${routePayload.imageId}`
      });
    } catch (error) {
      const message = error.message || error.msg || 'Generate failed, please retry.';
      wx.showToast({ title: message, icon: 'none' });
    } finally {
      this.setData({ generating: false });
    }
  }
});
