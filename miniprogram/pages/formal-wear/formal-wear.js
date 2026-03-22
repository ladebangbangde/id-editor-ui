const { STORAGE_KEYS } = require('../../utils/constants');
const storage = require('../../utils/storage');
const { createFormalWearTask, getFormalWearTask, buildFormalWearMockResult } = require('../../utils/api');

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const POLL_LIMIT = 8;
const POLL_DELAY = 1200;

const GENDER_OPTIONS = [
  { value: 'male', label: '男士' },
  { value: 'female', label: '女士' }
];

const STYLE_OPTIONS = [
  { value: 'standard', label: '标准正装', desc: '稳妥百搭，适合大多数报名场景' },
  { value: 'business', label: '商务正式', desc: '更成熟利落，适合职业资料照片' },
  { value: 'simple', label: '简洁职业', desc: '干净清爽，适合简历和通用正式照' }
];

const COLOR_OPTIONS = [
  { value: 'black', label: '黑色' },
  { value: 'navy', label: '藏青' },
  { value: 'gray', label: '灰色' }
];

function sleep(delay = POLL_DELAY) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function getOptionLabel(list = [], value = '') {
  const matched = list.find((item) => item.value === value);
  return matched ? matched.label : '';
}

function buildDraft(data = {}) {
  return {
    gender: data.gender || GENDER_OPTIONS[0].value,
    style: data.style || STYLE_OPTIONS[0].value,
    color: data.color || COLOR_OPTIONS[0].value,
    imagePath: data.imagePath || '',
    imageName: data.imageName || '',
    taskId: data.taskId || '',
    statusText: data.statusText || '',
    serverReady: typeof data.serverReady === 'boolean' ? data.serverReady : true
  };
}

Page({
  data: {
    genderOptions: GENDER_OPTIONS,
    styleOptions: STYLE_OPTIONS,
    colorOptions: COLOR_OPTIONS,
    gender: GENDER_OPTIONS[0].value,
    style: STYLE_OPTIONS[0].value,
    color: COLOR_OPTIONS[0].value,
    imagePath: '',
    imageName: '',
    generating: false,
    processingStep: 0,
    processingText: '',
    taskId: '',
    serverReady: true
  },

  onLoad() {
    const draft = buildDraft(storage.get(STORAGE_KEYS.FORMAL_WEAR_DRAFT, {}));
    this.setData(draft);
  },

  persistDraft(extra = {}) {
    storage.set(STORAGE_KEYS.FORMAL_WEAR_DRAFT, {
      ...buildDraft(this.data),
      ...extra
    });
  },

  handleGenderChange(event) {
    const { value } = event.currentTarget.dataset;
    if (!value) return;
    this.setData({ gender: value });
    this.persistDraft({ gender: value });
  },

  handleStyleChange(event) {
    const { value } = event.currentTarget.dataset;
    if (!value) return;
    this.setData({ style: value });
    this.persistDraft({ style: value });
  },

  handleColorChange(event) {
    const { value } = event.currentTarget.dataset;
    if (!value) return;
    this.setData({ color: value });
    this.persistDraft({ color: value });
  },

  chooseFromAlbum() {
    this.pickImage(['album']);
  },

  handleUploadBoxTap() {
    this.chooseFromAlbum();
  },

  chooseFromCamera() {
    this.pickImage(['camera']);
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

        const imageName = file.tempFilePath.split('/').pop() || '已上传照片';
        this.setData({ imagePath: file.tempFilePath, imageName });
        this.persistDraft({ imagePath: file.tempFilePath, imageName });
      }
    });
  },

  updateProcessing(step = 1, text = '正在处理，请稍候') {
    this.setData({ processingStep: step, processingText: text });
    this.persistDraft({ statusText: text });
  },

  buildSubmitPayload() {
    const { gender, style, color, imagePath } = this.data;
    return {
      gender,
      style,
      color,
      genderLabel: getOptionLabel(GENDER_OPTIONS, gender),
      styleLabel: getOptionLabel(STYLE_OPTIONS, style),
      colorLabel: getOptionLabel(COLOR_OPTIONS, color),
      originalUrl: imagePath,
      localImagePath: imagePath
    };
  },

  buildResultPayload(task = {}, extra = {}) {
    const submitPayload = this.buildSubmitPayload();
    return {
      ...task,
      originalUrl: task.originalUrl || submitPayload.originalUrl,
      previewUrl: task.previewUrl || task.resultUrl || '',
      resultUrl: task.resultUrl || task.previewUrl || '',
      gender: submitPayload.gender,
      genderLabel: submitPayload.genderLabel,
      style: submitPayload.style,
      styleLabel: submitPayload.styleLabel,
      color: submitPayload.color,
      colorLabel: submitPayload.colorLabel,
      imageName: this.data.imageName || '已上传照片',
      createdAt: Date.now(),
      ...extra
    };
  },

  openResultPage(task = {}, extra = {}) {
    const result = this.buildResultPayload(task, extra);
    storage.set(STORAGE_KEYS.FORMAL_WEAR_RESULT, result);
    this.persistDraft({
      taskId: result.taskId || '',
      statusText: '',
      serverReady: !result.isMock
    });
    this.setData({ generating: false, processingStep: 0, processingText: '' });
    wx.navigateTo({ url: '/pages/formal-wear-result/formal-wear-result' });
  },

  async pollFormalWearTask(taskId, fallbackTask = {}) {
    for (let index = 0; index < POLL_LIMIT; index += 1) {
      this.updateProcessing(2, `正在生成正式穿搭效果（${index + 1}/${POLL_LIMIT}）`);
      await sleep();
      try {
        const task = await getFormalWearTask(taskId);
        const status = String(task.status || '').toLowerCase();
        if (status === 'success' || status === 'completed' || task.resultUrl || task.previewUrl) {
          this.openResultPage(task);
          return;
        }

        if (status === 'failed') {
          throw new Error(task.message || '换装失败，请重试');
        }
      } catch (error) {
        if (index === POLL_LIMIT - 1) {
          throw error;
        }
      }
    }

    const fallbackResult = (fallbackTask && (fallbackTask.previewUrl || fallbackTask.resultUrl))
      ? fallbackTask
      : buildFormalWearMockResult(this.buildSubmitPayload());

    this.openResultPage(fallbackResult, {
      status: fallbackTask.status || 'processing',
      isMock: !fallbackTask.previewUrl && !fallbackTask.resultUrl,
      tips: ['服务端仍在处理中，当前先展示提交结果占位，可稍后重新制作刷新。']
    });
  },

  async simulateFallbackResult() {
    this.setData({ serverReady: false });
    this.persistDraft({ serverReady: false });
    this.updateProcessing(1, '服务端接口待接入，先为你展示前端预览链路');
    await sleep(900);
    this.updateProcessing(2, '正在生成占位预览，后续 server 完成后可直接切真实结果');
    await sleep(1200);
    const mockResult = buildFormalWearMockResult(this.buildSubmitPayload());
    this.openResultPage(mockResult, { isMock: true });
  },

  async handleGenerate() {
    const { imagePath, generating } = this.data;
    if (!imagePath) {
      wx.showToast({ title: '请先上传照片', icon: 'none' });
      return;
    }

    if (generating) {
      return;
    }

    this.setData({ generating: true, processingStep: 1, processingText: '正在提交换装请求' });

    try {
      const task = await createFormalWearTask(imagePath, this.buildSubmitPayload());
      if (!task || (!task.taskId && !task.previewUrl && !task.resultUrl)) {
        await this.simulateFallbackResult();
        return;
      }

      if (!task.taskId) {
        this.openResultPage(task, { status: task.status || 'success' });
        return;
      }

      this.setData({ taskId: task.taskId, serverReady: true });
      this.persistDraft({ taskId: task.taskId, serverReady: true });
      await this.pollFormalWearTask(task.taskId, task);
    } catch (error) {
      await this.simulateFallbackResult();
    } finally {
      this.setData({ generating: false });
    }
  }
});
