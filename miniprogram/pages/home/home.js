const { getHomeTemplateConfig } = require('../../utils/api');
const { getFriendlySceneName, getFriendlySceneHint } = require('../../utils/photo-display');
const { resetFlowDraft } = require('../../utils/flow-draft');
const { toCanonicalSizeCode, buildSceneBySizeCode } = require('../../utils/size-codes');
const { debounce } = require('../../utils/debounce');
const { getCache, setCache } = require('../../utils/page-cache');

const HOME_TABS = [
  { key: 'popular', label: '热门尺寸' },
  { key: 'general', label: '通用寸照' },
  { key: 'medical', label: '医药卫生' },
  { key: 'language', label: '语言考试' },
  { key: 'civil', label: '公务考试' },
  { key: 'degree', label: '学历考试' },
  { key: 'career', label: '职业资格' },
  { key: 'passport', label: '签证护照' },
  { key: 'police', label: '公安证件' },
  { key: 'social', label: '社保民政' }
];

const MAIN_ACTIONS = [
  {
    key: 'photo',
    title: '拍摄证件照',
    subtitle: '点按直接拍摄',
    iconClass: 'icon-camera',
    iconType: 'camera',
    cardClass: 'main-card-camera',
    badge: '拍摄',
    routeType: 'upload'
  },
  {
    key: 'background',
    title: '一键换底色',
    subtitle: '智能换底',
    iconClass: 'icon-color',
    iconType: 'palette',
    cardClass: 'main-card-color',
    badge: '换底',
    routeType: 'background'
  }
];

function getHomeBrandContent() {
  return {
    subtitle: '标准寸照与换底色',
    tags: ['常用尺寸', '快速出图']
  };
}

const HOME_TEMPLATE_MAP = {
  popular: [
    {
      sceneKey: 'one_inch',
      name: '一寸',
      pixelWidth: 295,
      pixelHeight: 413,
      hot: true,
      tip: '适合常规证件办理与简历投递',
      tags: ['白底', '蓝底', '红底', '常用']
    },
    {
      sceneKey: 'two_inch',
      name: '二寸',
      pixelWidth: 413,
      pixelHeight: 579,
      hot: true,
      tip: '常用于报名、资格审核与出国材料',
      tags: ['白底', '蓝底', '官方推荐']
    },
    {
      sceneKey: 'teacher_exam',
      name: '教资报名（请选白底）',
      pixelWidth: 295,
      pixelHeight: 413,
      hot: true,
      tip: '教师资格考试报名常用规格',
      tags: ['白底', '热门', '考试报名']
    },
    {
      sceneKey: 'university_collect',
      name: '大学生图像采集',
      pixelWidth: 480,
      pixelHeight: 640,
      hot: false,
      tip: '学信网及毕业图像采集常见规格',
      tags: ['白底', '常用']
    },
    {
      sceneKey: 'computer_exam',
      name: '计算机考试',
      pixelWidth: 390,
      pixelHeight: 567,
      hot: false,
      tip: '适用于计算机等级考试报名',
      tags: ['蓝底', '考试']
    },
    {
      sceneKey: 'health_certificate',
      name: '健康证',
      pixelWidth: 358,
      pixelHeight: 441,
      hot: false,
      tip: '常见健康证办理上传尺寸',
      tags: ['红底', '医药卫生']
    }
  ],
  general: [
    {
      sceneKey: 'small_one_inch',
      name: '小一寸',
      pixelWidth: 260,
      pixelHeight: 378,
      hot: false,
      tip: '适用于部分表格、工牌与报名',
      tags: ['白底', '通用']
    },
    {
      sceneKey: 'one_inch_general',
      name: '一寸',
      pixelWidth: 295,
      pixelHeight: 413,
      hot: true,
      tip: '基础通用寸照规格',
      tags: ['白底', '蓝底', '红底']
    },
    {
      sceneKey: 'two_inch_general',
      name: '二寸',
      pixelWidth: 413,
      pixelHeight: 579,
      hot: true,
      tip: '常见通用报名及资格申请',
      tags: ['白底', '常用']
    },
    {
      sceneKey: 'resume_photo',
      name: '简历照片',
      pixelWidth: 295,
      pixelHeight: 413,
      hot: false,
      tip: '适合求职、简历附件与资料提交',
      tags: ['白底', '职业']
    }
  ],
  medical: [
    {
      sceneKey: 'health_certificate',
      name: '健康证',
      pixelWidth: 358,
      pixelHeight: 441,
      hot: true,
      tip: '常用于健康证、体检相关办理',
      tags: ['红底', '常用']
    },
    {
      sceneKey: 'nurse_exam',
      name: '护士执业考试',
      pixelWidth: 413,
      pixelHeight: 579,
      hot: false,
      tip: '医药卫生考试报名可优先使用白底',
      tags: ['白底', '官方推荐']
    }
  ],
  language: [
    {
      sceneKey: 'mandarin_test',
      name: '普通话考试',
      pixelWidth: 390,
      pixelHeight: 567,
      hot: false,
      tip: '语言类考试常见上传规格',
      tags: ['白底', '考试']
    },
    {
      sceneKey: 'ielts_signup',
      name: '雅思报名',
      pixelWidth: 413,
      pixelHeight: 531,
      hot: false,
      tip: '可用于语言考试报名资料提交',
      tags: ['白底', '签证护照']
    }
  ],
  civil: [
    {
      sceneKey: 'provincial_exam',
      name: '省考',
      pixelWidth: 295,
      pixelHeight: 413,
      hot: true,
      tip: '公务员 / 省考报名常见规格',
      tags: ['白底', '热门']
    },
    {
      sceneKey: 'national_exam',
      name: '国考报名',
      pixelWidth: 413,
      pixelHeight: 579,
      hot: true,
      tip: '国家公务员考试报名模板',
      tags: ['白底', '官方推荐']
    }
  ],
  degree: [
    {
      sceneKey: 'university_collect',
      name: '大学生图像采集',
      pixelWidth: 480,
      pixelHeight: 640,
      hot: true,
      tip: '毕业、学籍信息采集常用规格',
      tags: ['白底', '学历考试']
    },
    {
      sceneKey: 'graduate_exam',
      name: '考研报名',
      pixelWidth: 413,
      pixelHeight: 579,
      hot: false,
      tip: '研究生考试报名上传可使用白底',
      tags: ['白底', '考试报名']
    }
  ],
  career: [
    {
      sceneKey: 'teacher_exam',
      name: '教资报名（请选白底）',
      pixelWidth: 295,
      pixelHeight: 413,
      hot: true,
      tip: '教师资格证考试报名模板',
      tags: ['白底', '职业资格']
    },
    {
      sceneKey: 'computer_exam',
      name: '计算机考试',
      pixelWidth: 390,
      pixelHeight: 567,
      hot: false,
      tip: '职业资格及等级考试常用',
      tags: ['蓝底', '常用']
    }
  ],
  passport: [
    {
      sceneKey: 'passport_photo',
      name: '护照',
      pixelWidth: 413,
      pixelHeight: 531,
      hot: true,
      tip: '护照、港澳通行证等常见模板',
      tags: ['白底', '官方推荐']
    },
    {
      sceneKey: 'visa_photo',
      name: '签证照片',
      pixelWidth: 413,
      pixelHeight: 531,
      hot: false,
      tip: '适用于常见国家签证申请',
      tags: ['白底', '签证护照']
    }
  ],
  police: [
    {
      sceneKey: 'driving_license',
      name: '驾驶证',
      pixelWidth: 260,
      pixelHeight: 378,
      hot: true,
      tip: '驾驶证报名、换证等常见规格',
      tags: ['白底', '公安证件']
    },
    {
      sceneKey: 'id_card',
      name: '身份证补办照',
      pixelWidth: 358,
      pixelHeight: 441,
      hot: false,
      tip: '可作公安证件资料参考模板',
      tags: ['白底', '证件办理']
    }
  ],
  social: [
    {
      sceneKey: 'social_security',
      name: '社保卡',
      pixelWidth: 358,
      pixelHeight: 441,
      hot: true,
      tip: '社保卡、民政事务常用规格',
      tags: ['白底', '社保民政']
    },
    {
      sceneKey: 'marriage_registration',
      name: '结婚登记照',
      pixelWidth: 413,
      pixelHeight: 579,
      hot: true,
      tip: '结婚登记照建议优先选红底',
      tags: ['红底', '民政办理']
    }
  ]
};

function buildPixelText(item = {}) {
  const pixelWidth = Number(item.pixelWidth || item.pixel_width || 0);
  const pixelHeight = Number(item.pixelHeight || item.pixel_height || 0);
  if (!pixelWidth || !pixelHeight) {
    return item.pixelText || '尺寸待确认';
  }
  return `${pixelWidth} × ${pixelHeight}px`;
}

function normalizeTemplate(item = {}) {
  const sceneKey = item.sceneKey || item.scene_key || '';
  const canonicalSizeCode = toCanonicalSizeCode(sceneKey);
  const canonicalScene = buildSceneBySizeCode(canonicalSizeCode);
  const sceneName = item.sceneName || item.scene_name || item.name || '';
  const tags = Array.isArray(item.tags) ? item.tags : [];
  return {
    ...item,
    name: getFriendlySceneName({
      sceneKey,
      sizeCode: item.sizeCode || item.size_code || '',
      sceneName
    }, '未命名模板'),
    sceneKey,
    sceneName,
    tags,
    displayTags: tags.slice(0, 2),
    tip: item.tip || item.description || getFriendlySceneHint({ sceneKey }) || '',
    hot: Boolean(item.hot || item.featured),
    pixelText: buildPixelText(item),
    canonicalSizeCode,
    canonicalScene
  };
}

function getMockTemplatesByTab(tabKey) {
  return (HOME_TEMPLATE_MAP[tabKey] || []).map(normalizeTemplate);
}

function matchTemplateKeyword(item = {}, keyword = '') {
  const normalizedKeyword = String(keyword || '').trim().toLowerCase();
  if (!normalizedKeyword) {
    return true;
  }

  const searchText = [
    item.name,
    item.sceneName,
    item.tip,
    item.pixelText,
    ...(Array.isArray(item.tags) ? item.tags : [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return searchText.includes(normalizedKeyword);
}

const HOME_CACHE_KEY_PREFIX = 'home_templates';
const HOME_CACHE_TTL = 30000;

Page({
  data: {
    brandContent: getHomeBrandContent(),
    loading: true,
    error: false,
    errorMessage: '',
    tabs: HOME_TABS,
    activeTab: HOME_TABS[0].key,
    activeTabLabel: HOME_TABS[0].label,
    mainActions: MAIN_ACTIONS,
    allTemplateList: [],
    templateList: [],
    searchKeyword: '',
    searchActive: false,
    isEmpty: false,
    templateRenderLimit: 8,
    actionLocked: false
  },

  onLoad() {
    this.debouncedSearch = debounce((keyword) => {
      this.applyTemplateFilter(this.data.allTemplateList, keyword);
    }, 200);
    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline']
    });
    this.loadHomeTemplates(this.data.activeTab, { allowCache: true });
  },

  onShareAppMessage() {
    return {
      title: '棒棒证件照｜标准尺寸一键生成，快速出图',
      path: '/pages/home/home',
      imageUrl: undefined
    };
  },

  onShareTimeline() {
    return {
      title: '棒棒证件照｜标准尺寸一键生成，快速出图',
      query: 'from=share_timeline_home',
      imageUrl: undefined
    };
  },

  applyTemplateFilter(sourceList = this.data.allTemplateList, keyword = this.data.searchKeyword) {
    const normalizedKeyword = String(keyword || '').trim();
    const nextList = normalizedKeyword
      ? sourceList.filter((item) => matchTemplateKeyword(item, normalizedKeyword))
      : sourceList;

    const renderList = normalizedKeyword
      ? nextList
      : nextList.slice(0, this.data.templateRenderLimit);

    this.setData({
      templateList: renderList,
      searchKeyword: normalizedKeyword,
      searchActive: Boolean(normalizedKeyword),
      isEmpty: nextList.length === 0
    });

    if (!normalizedKeyword && nextList.length > renderList.length) {
      clearTimeout(this.templateFlushTimer);
      this.templateFlushTimer = setTimeout(() => {
        if (this.data.searchKeyword) return;
        this.setData({ templateList: nextList });
      }, 80);
    }
  },

  async loadHomeTemplates(tabKey = this.data.activeTab, options = {}) {
    const currentTab = this.data.tabs.find((item) => item.key === tabKey) || this.data.tabs[0];

    const cacheKey = `${HOME_CACHE_KEY_PREFIX}:${currentTab.key}`;
    const cached = options.allowCache ? getCache(cacheKey) : null;

    this.setData({
      loading: !cached,
      error: false,
      errorMessage: '',
      activeTab: currentTab.key,
      activeTabLabel: currentTab.label
    });

    if (cached) {
      this.setData({
        tabs: cached.tabs || this.data.tabs,
        allTemplateList: cached.allTemplateList || [],
        loading: false
      });
      this.applyTemplateFilter(cached.allTemplateList || [], this.data.searchKeyword);
      return;
    }

    try {
      const response = await getHomeTemplateConfig(currentTab.key, { dedupeKey: `home-${currentTab.key}` });
      const serverTabs = response.tabs;
      const serverTemplates = response.templates;
      const nextTabs = Array.isArray(serverTabs) && serverTabs.length ? serverTabs : this.data.tabs;
      const normalizedList = Array.isArray(serverTemplates) && serverTemplates.length
        ? serverTemplates.map(normalizeTemplate)
        : getMockTemplatesByTab(currentTab.key);

      this.setData({
        tabs: nextTabs,
        allTemplateList: normalizedList,
        loading: false
      });
      setCache(cacheKey, { tabs: nextTabs, allTemplateList: normalizedList }, HOME_CACHE_TTL);
      this.applyTemplateFilter(normalizedList, this.data.searchKeyword);
    } catch (error) {
      const fallbackList = getMockTemplatesByTab(currentTab.key);
      this.setData({
        allTemplateList: fallbackList,
        loading: false,
        error: fallbackList.length === 0,
        errorMessage: '网络异常，已尝试切换本地模板，请稍后重试。'
      });
      this.applyTemplateFilter(fallbackList, this.data.searchKeyword);

      if (fallbackList.length) {
        wx.showToast({ title: '已切换为默认模板', icon: 'none' });
      }
    }
  },

  handleTabChange(event) {
    const { key } = event.currentTarget.dataset;
    if (!key || key === this.data.activeTab || this.data.loading) {
      return;
    }
    this.loadHomeTemplates(key, { allowCache: true });
  },

  handleSearchInput(event) {
    const keyword = event.detail.value || '';
    this.setData({ searchKeyword: keyword });
    this.debouncedSearch(keyword);
  },

  handleSearchClear() {
    this.applyTemplateFilter(this.data.allTemplateList, '');
  },

  handleMainActionTap(event) {
    if (this.data.actionLocked) return;
    const { item } = event.currentTarget.dataset;
    this.setData({ actionLocked: true });
    this.navigateByAction(item);
    setTimeout(() => this.setData({ actionLocked: false }), 500);
  },


  handleTemplateTap(event) {
    const { item } = event.currentTarget.dataset;
    if (!item || !item.sceneKey) {
      wx.showToast({ title: '模板信息异常，请重试', icon: 'none' });
      return;
    }

    resetFlowDraft({
      flowType: 'idPhoto',
      flowMode: 'template',
      needSelectSize: false,
      selectedScene: item.canonicalScene || buildSceneBySizeCode('one_inch'),
      selectedSizeCode: item.canonicalSizeCode || 'one_inch'
    });
    wx.navigateTo({ url: `/pages/upload/upload?flowMode=template&needSelectSize=0&selectedSizeCode=${item.canonicalSizeCode || 'one_inch'}&from=home-template` });
  },

  handleRetry() {
    this.loadHomeTemplates(this.data.activeTab, { allowCache: false });
  },

  goCustomSize() {
    wx.navigateTo({ url: '/pages/custom-size/custom-size' });
  },

  goFaq() {
    wx.navigateTo({ url: '/pages/faq/faq' });
  },

  onUnload() {
    clearTimeout(this.templateFlushTimer);
  },

  navigateByAction(action = {}) {
    if (!action.routeType) {
      return;
    }

    if (action.routeType === 'custom-size') {
      this.goCustomSize();
      return;
    }

    if (action.routeType === 'upload') {
      resetFlowDraft({ flowType: 'idPhoto', flowMode: 'free', needSelectSize: true });
      wx.navigateTo({ url: '/pages/upload/upload?flowMode=free&needSelectSize=1&from=home-photo&entry=camera&cameraOnly=1' });
      return;
    }

    if (action.routeType === 'background') {
      resetFlowDraft({
        flowType: 'idPhoto',
        flowMode: 'free',
        needSelectSize: true,
        backgroundColor: 'blue'
      });
      wx.navigateTo({ url: '/pages/upload/upload?flowMode=free&needSelectSize=1&from=home-background' });
      return;
    }


    wx.showToast({ title: action.toastText || '功能开发中', icon: 'none' });
  }
});
