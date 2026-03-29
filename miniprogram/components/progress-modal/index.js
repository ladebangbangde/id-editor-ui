const STAGE_META = {
  received: { name: '初始化任务', description: '我们已收到照片，正在准备处理。' },
  checking: { name: '检查照片', description: '正在确认照片是否清晰、完整。' },
  adjusting: { name: '整理背景', description: '正在优化背景与画面边缘效果。' },
  generating: { name: '生成结果', description: '正在生成符合规格的证件照。' },
  finalizing: { name: '保存完成', description: '正在保存结果并准备展示。' },
  success: { name: '处理完成', description: '已完成，马上为你打开结果。' },
  failed: { name: '处理失败', description: '照片处理未完成，请重试。' }
};

const STAGE_ORDER = ['received', 'checking', 'adjusting', 'generating', 'finalizing'];

function normalizeStageCode(value = '') {
  return String(value || '').trim().toLowerCase();
}

Component({
  properties: {
    visible: { type: Boolean, value: false },
    stageCode: { type: String, value: '' },
    stageName: { type: String, value: '' },
    stageDescription: { type: String, value: '' },
    progress: { type: Number, value: 5 },
    elapsedSeconds: { type: Number, value: 0 },
    status: { type: String, value: 'processing' },
    errorMessage: { type: String, value: '' }
  },

  data: {
    stageName: '正在准备处理',
    stageDescription: '正在同步处理进度，请稍候。',
    stageList: []
  },

  observers: {
    stageCode(value) {
      this.syncStageMeta(value, this.properties.status);
    },
    stageName() {
      this.syncStageMeta(this.properties.stageCode, this.properties.status);
    },
    stageDescription() {
      this.syncStageMeta(this.properties.stageCode, this.properties.status);
    },
    status(value) {
      this.syncStageMeta(this.properties.stageCode, value);
    }
  },

  lifetimes: {
    attached() {
      this.syncStageMeta(this.properties.stageCode, this.properties.status);
    }
  },

  methods: {
    syncStageMeta(stageCode, status) {
      const normalizedStage = normalizeStageCode(stageCode);
      const normalizedStatus = String(status || '').trim().toLowerCase();
      const isFailed = normalizedStatus === 'failed' || normalizedStatus === 'timeout';
      const finalStageCode = isFailed ? 'failed' : normalizedStage;
      const stageMeta = STAGE_META[finalStageCode] || {};
      const stageIndex = STAGE_ORDER.indexOf(normalizedStage);

      const stageList = STAGE_ORDER.map((code, index) => {
        const active = code === normalizedStage;
        const done = stageIndex >= 0 && index < stageIndex;
        return {
          code,
          label: (STAGE_META[code] && STAGE_META[code].name) || code,
          active,
          done
        };
      });

      this.setData({
        stageName: this.properties.stageName || stageMeta.name || '正在准备处理',
        stageDescription: isFailed
          ? (this.properties.errorMessage || '请稍后重试，或重新上传照片。')
          : (this.properties.stageDescription || stageMeta.description || '正在同步处理进度，请稍候。'),
        stageList
      });
    },

    onRetryTap() {
      this.triggerEvent('retry');
    }
  }
});
