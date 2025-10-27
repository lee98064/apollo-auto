import { computed, reactive, watch } from 'vue'

const DEFAULT_SERVER_URL = 'http://localhost:5566'
const TIME_PATTERN = /^\d{2}:\d{2}$/
const COOKIE_DOMAIN = '.mayohr.com'
const TARGET_COOKIES = ['__ModuleSessionCookie', '__ModuleSessionCookie2']
const STORAGE_KEY = 'apollo-auto-extention-v2'
const VALID_TABS = ['status', 'cookie', 'job', 'telegram']

const state = reactive({
  authToken: null,
  currentUser: null,
  serverUrl: DEFAULT_SERVER_URL,
  serverUrlInput: DEFAULT_SERVER_URL,
  activeTab: 'status',
  lastView: {
    route: '/login',
    tab: 'status',
  },
  isReady: false,
  loginForm: {
    account: '',
    password: '',
  },
  registerForm: {
    account: '',
    password: '',
    displayName: '',
    timezone: 'Asia/Taipei',
  },
  jobForm: createJobFormState(),
  isJobFormVisible: false,
  editingJobId: null,
  jobs: [],
  jobEmptyMessage: '載入排程中...',
  statusJobs: [],
  statusEmptyMessage: '載入狀態中...',
  statusOverview: {
    totalJobs: '-',
    activeJobs: '-',
    lastExecution: '-',
  },
  telegramTokens: [],
  telegramEmptyMessage: '尚未載入資料',
  isTelegramFormVisible: false,
  editingTelegramId: null,
  telegramForm: createTelegramFormState(),
  statuses: createStatusesState(),
  loading: createLoadingState(),
  cookieState: createCookieState(),
  cookieCopySuccess: false,
})

const greeting = computed(() => {
  if (!state.currentUser) {
    return '載入中...'
  }
  const display =
    state.currentUser.displayName ||
    state.currentUser.account ||
    '未知使用者'
  return `您好，${display}`
})

const jobFormSubmitLabel = computed(() => {
  if (state.loading.jobForm) {
    return state.editingJobId !== null ? '更新中...' : '新增中...'
  }
  return state.editingJobId !== null ? '更新排程' : '新增排程'
})

const cookieOutputClass = computed(() =>
  state.cookieState.copyDisabled ? 'cookie-output empty' : 'cookie-output'
)

const cookieCopyButtonLabel = computed(() =>
  state.cookieCopySuccess ? '已複製！' : '複製到剪貼板'
)

const telegramFormTitle = computed(() =>
  state.editingTelegramId !== null ? '編輯 Telegram Token' : '新增 Telegram Token'
)

const telegramSaveButtonLabel = computed(() => {
  if (state.loading.telegramSave) {
    return state.editingTelegramId !== null ? '儲存中...' : '新增中...'
  }
  return state.editingTelegramId !== null ? '儲存變更' : '新增'
})

const statusTimers = new Map()
const routerRef = { value: null }

const hasChromeRuntime =
  typeof chrome !== 'undefined' && chrome.runtime?.sendMessage
const hasChromeStorage =
  typeof chrome !== 'undefined' && chrome.storage?.local
const hasChromeCookies =
  typeof chrome !== 'undefined' && chrome.cookies?.getAll

watch(
  () => state.serverUrl,
  (value) => {
    state.serverUrlInput = value || DEFAULT_SERVER_URL
  },
  { immediate: true }
)

watch(
  () => state.activeTab,
  (value) => {
    if (!state.isReady) return
    if (!VALID_TABS.includes(value)) {
      state.activeTab = 'status'
      return
    }
    state.lastView.tab = value
    persistLocal({
      lastView: {
        route: state.lastView.route,
        tab: value,
      },
    }).catch((error) => console.warn('Failed to persist tab view', error))
  }
)

export function useAppState() {
  return {
    state,
    greeting,
    jobFormSubmitLabel,
    cookieOutputClass,
    cookieCopyButtonLabel,
    telegramFormTitle,
    telegramSaveButtonLabel,
    setActiveTab,
    saveSettings,
    login,
    register,
    logout,
    extractCookies,
    copyCookies,
    uploadCookies,
    showAddJobForm,
    hideAddJobForm,
    submitJobForm,
    editJob,
    deleteJob,
    toggleJobStatus,
    loadJobStatus,
    loadJobs,
    loadTelegramTokens,
    showTelegramTokenForm,
    hideTelegramTokenForm,
    saveTelegramToken,
    deleteTelegramToken,
    sendTelegramTest,
    jobTypeLabel,
    formatJobTime,
    formatDateTime,
    formatExecutionInfo,
    jobStatusLabel,
    maskSensitiveValue,
  }
}

export async function initializeAppState(router) {
  routerRef.value = router
  state.isReady = false

  await loadSettings()
  await resolveInitialRoute()

  router.afterEach((to) => {
    state.lastView.route = to.path
    persistLocal({
      lastView: {
        route: to.path,
        tab: state.activeTab,
      },
    }).catch((error) => console.warn('Failed to persist last view', error))
  })

  state.isReady = true
}

function setActiveTab(tab) {
  if (!VALID_TABS.includes(tab)) {
    return
  }
  state.activeTab = tab
}

async function resolveInitialRoute() {
  if (!routerRef.value) {
    return
  }

  const targetRoute = computeInitialRoute()

  try {
    await routerRef.value.replace(targetRoute)
  } catch (error) {
    console.warn('Failed to navigate to initial route', error)
  }
}

function computeInitialRoute() {
  if (state.authToken && state.currentUser) {
    const savedRoute =
      state.lastView.route &&
      !['/login', '/register'].includes(state.lastView.route)
        ? state.lastView.route
        : '/dashboard'
    const savedTab = VALID_TABS.includes(state.lastView.tab)
      ? state.lastView.tab
      : 'status'
    state.activeTab = savedTab
    return savedRoute
  }

  state.activeTab = 'status'
  if (state.lastView.route === '/register') {
    return '/register'
  }
  if (state.lastView.route === '/settings') {
    return '/settings'
  }
  return '/login'
}

async function loadSettings() {
  try {
    const settings = await storageGet([
      'authToken',
      'serverUrl',
      'currentUser',
      'lastView',
    ])

    state.authToken = settings.authToken || null
    state.currentUser = settings.currentUser || null
    state.serverUrl = settings.serverUrl || DEFAULT_SERVER_URL
    state.serverUrlInput = state.serverUrl

    if (settings.lastView) {
      state.lastView.route =
        typeof settings.lastView.route === 'string' &&
        settings.lastView.route.length > 0
          ? settings.lastView.route
          : '/login'
      state.lastView.tab = VALID_TABS.includes(settings.lastView.tab)
        ? settings.lastView.tab
        : 'status'
    }

    debugLog('Settings loaded', {
      hasToken: !!state.authToken,
      hasUser: !!state.currentUser,
      serverUrl: state.serverUrl,
      lastView: { ...state.lastView },
    })
  } catch (error) {
    console.error('Error loading settings:', error)
  }
}

async function saveCoreSettings() {
  await persistLocal({
    authToken: state.authToken,
    currentUser: state.currentUser,
    serverUrl: state.serverUrl,
  })
  debugLog('Core settings saved', {
    hasToken: !!state.authToken,
    hasUser: !!state.currentUser,
  })
}

async function saveSettings() {
  if (!state.serverUrlInput) {
    showStatus('settings', '請輸入伺服器位址', 'error')
    return
  }

  state.loading.settings = true
  try {
    state.serverUrl = state.serverUrlInput.trim()
    await saveCoreSettings()
    showStatus('settings', '設定已儲存', 'success')
  } catch (error) {
    console.error('Save settings failed:', error)
    showStatus('settings', '儲存失敗', 'error')
  } finally {
    state.loading.settings = false
  }
}

async function login() {
  if (!state.loginForm.account || !state.loginForm.password) {
    showStatus('login', '請輸入帳號和密碼', 'error')
    return
  }

  state.loading.login = true
  try {
    const response = await apiCall('/api/login', 'POST', {
      account: state.loginForm.account,
      password: state.loginForm.password,
    })

    if (response.success) {
      const decoded = decodeJWT(response.result.token)
      state.currentUser =
        decoded?.user ||
        response.result.user || { account: state.loginForm.account }
      state.authToken = response.result.token

      await saveCoreSettings()

      sendToBackground('AUTH_STATE_CHANGED', {
        isLoggedIn: true,
        user: state.currentUser,
        token: state.authToken,
      })

      showStatus('login', '登入成功！', 'success')
      state.loginForm.account = ''
      state.loginForm.password = ''

      setTimeout(() => {
        navigateAfterAuth()
      }, 600)
    } else {
      showStatus(
        'login',
        response.error?.message || '登入失敗',
        'error'
      )
    }
  } catch (error) {
    console.error('Login failed:', error)
    showStatus('login', '連線失敗，請檢查伺服器設定', 'error')
  } finally {
    state.loading.login = false
  }
}

async function register() {
  if (
    !state.registerForm.account ||
    !state.registerForm.password ||
    !state.registerForm.displayName
  ) {
    showStatus('register', '請填寫所有必填欄位', 'error')
    return
  }

  state.loading.register = true
  try {
    const response = await apiCall('/api/register', 'POST', {
      account: state.registerForm.account,
      password: state.registerForm.password,
      displayName: state.registerForm.displayName,
      timezone: state.registerForm.timezone || 'Asia/Taipei',
    })

    if (response.success) {
      const decoded = decodeJWT(response.result.token)
      state.currentUser =
        decoded?.user ||
        response.result.user || {
          account: state.registerForm.account,
          displayName: state.registerForm.displayName,
          timezone: state.registerForm.timezone,
        }
      state.authToken = response.result.token

      await saveCoreSettings()

      sendToBackground('AUTH_STATE_CHANGED', {
        isLoggedIn: true,
        user: state.currentUser,
        token: state.authToken,
      })

      showStatus('register', '註冊成功！', 'success')

      state.registerForm.account = ''
      state.registerForm.password = ''
      state.registerForm.displayName = ''
      state.registerForm.timezone = 'Asia/Taipei'

      setTimeout(() => {
        navigateAfterAuth()
      }, 600)
    } else {
      showStatus(
        'register',
        response.error?.message || '註冊失敗',
        'error'
      )
    }
  } catch (error) {
    console.error('Register failed:', error)
    showStatus('register', '連線失敗，請檢查伺服器設定', 'error')
  } finally {
    state.loading.register = false
  }
}

async function logout() {
  state.authToken = null
  state.currentUser = null
  state.jobs = []
  state.statusJobs = []
  state.telegramTokens = []
  state.cookieState.output = '點擊上方按鈕提取 cookies...'
  state.cookieState.jsonString = null
  state.cookieState.copyDisabled = true
  state.cookieState.uploadDisabled = true
  state.cookieCopySuccess = false
  hideAddJobForm()
  hideTelegramTokenForm()
  state.jobEmptyMessage = '請登入後管理排程'
  state.statusEmptyMessage = '請登入以檢視排程狀態'
  state.telegramEmptyMessage = '請登入後管理 Telegram Token'

  await saveCoreSettings()

  sendToBackground('AUTH_STATE_CHANGED', {
    isLoggedIn: false,
    user: null,
    token: null,
  })

  if (routerRef.value) {
    routerRef.value.push({ name: 'login' })
  }
}

async function extractCookies() {
  if (!hasChromeCookies) {
    showStatus('cookie', '此環境無法使用 Cookie API', 'error')
    return
  }

  state.loading.cookies = true
  try {
    const cookies = await chromeCookiesGetAll({ domain: COOKIE_DOMAIN })
    const targets = cookies.filter((cookie) =>
      TARGET_COOKIES.includes(cookie.name)
    )

    if (targets.length === 0) {
      throw new Error(
        `未找到目標 cookies (${TARGET_COOKIES.join(', ')})。請確保已登入 MayoHR 系統。`
      )
    }

    const formatted = targets.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
    }))

    state.cookieState.output = JSON.stringify(formatted, null, 2)
    state.cookieState.jsonString = JSON.stringify(formatted)
    state.cookieState.copyDisabled = false
    state.cookieState.uploadDisabled = false
    showStatus(
      'cookie',
      `成功提取 ${targets.length} 個 cookies`,
      'success'
    )

    sendToBackground('COOKIE_EXTRACTED', {
      count: targets.length,
      cookies: formatted.map((item) => ({
        name: item.name,
        valueLength: item.value?.length || 0,
      })),
    })
  } catch (error) {
    console.error('Extract cookies failed:', error)
    state.cookieState.output = '提取失敗：' + error.message
    state.cookieState.jsonString = null
    state.cookieState.copyDisabled = true
    state.cookieState.uploadDisabled = true
    showStatus('cookie', error.message, 'error')
  } finally {
    state.loading.cookies = false
  }
}

async function copyCookies() {
  try {
    if (!state.cookieState.jsonString) {
      throw new Error('沒有可複製的 cookie 數據')
    }

    await navigator.clipboard.writeText(state.cookieState.jsonString)
    state.cookieCopySuccess = true
    showStatus('cookie', '已複製到剪貼板！', 'success')
    setTimeout(() => {
      state.cookieCopySuccess = false
    }, 2000)
  } catch (error) {
    console.error('Copy cookies failed:', error)
    showStatus('cookie', '複製失敗：' + error.message, 'error')
  }
}

async function uploadCookies() {
  if (!state.cookieState.jsonString) {
    showStatus('cookie', '沒有可上傳的 cookie 數據', 'error')
    return
  }

  state.loading.cookieUpload = true
  try {
    const response = await apiCall('/api/cookies', 'PUT', {
      value: state.cookieState.jsonString,
    })

    if (response.success) {
      showStatus('cookie', 'Cookies 已成功上傳至伺服器！', 'success')
    } else {
      throw new Error(response.error?.message || '上傳失敗')
    }
  } catch (error) {
    console.error('Upload cookies failed:', error)
    showStatus('cookie', '上傳失敗：' + error.message, 'error')
  } finally {
    state.loading.cookieUpload = false
  }
}

function showAddJobForm() {
  const now = new Date()
  const defaultTime = `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`
  resetJobForm()
  state.jobForm.startTime = defaultTime
  state.isJobFormVisible = true
  state.editingJobId = null
}

function hideAddJobForm() {
  state.isJobFormVisible = false
  state.editingJobId = null
  resetJobForm()
}

async function submitJobForm() {
  if (!state.jobForm.startTime) {
    showStatus('job', '請選擇開始時間', 'error')
    return
  }

  if (!TIME_PATTERN.test(state.jobForm.startTime)) {
    showStatus('job', '開始時間格式需為 HH:mm', 'error')
    return
  }

  if (state.jobForm.endTime && !TIME_PATTERN.test(state.jobForm.endTime)) {
    showStatus('job', '結束時間格式需為 HH:mm', 'error')
    return
  }

  state.loading.jobForm = true
  try {
    const payload = {
      type: state.jobForm.type,
      startAt: state.jobForm.startTime.trim(),
      endAt: state.jobForm.endTime ? state.jobForm.endTime.trim() : null,
      expiredAt: state.jobForm.expireTime
        ? new Date(state.jobForm.expireTime).toISOString()
        : null,
      isActive: state.jobForm.isActive,
      data: JSON.stringify({
        skipHoliday: state.jobForm.skipHoliday,
        skipLeaves: state.jobForm.skipLeaves,
      }),
    }

    const isEditing = state.editingJobId !== null
    const endpoint = isEditing
      ? `/api/jobs/${state.editingJobId}`
      : '/api/jobs'
    const method = isEditing ? 'PUT' : 'POST'

    const response = await apiCall(endpoint, method, payload)

    if (response.success) {
      showStatus(
        'job',
        isEditing ? '排程已更新' : '排程已建立',
        'success'
      )
      hideAddJobForm()
      await loadJobs()
      if (state.activeTab === 'status') {
        await loadJobStatus()
      }
    } else {
      throw new Error(
        response.error?.message || `${isEditing ? '更新' : '新增'}排程失敗`
      )
    }
  } catch (error) {
    console.error('Submit job form failed:', error)
    showStatus('job', error.message, 'error')
  } finally {
    state.loading.jobForm = false
  }
}

function editJob(job) {
  state.editingJobId = job.id
  state.isJobFormVisible = true
  state.jobForm.type = job.type
  state.jobForm.startTime = normalizeTimeInput(job.startAt)
  state.jobForm.endTime = normalizeTimeInput(job.endAt)

  if (job.expiredAt) {
    const expire = new Date(job.expiredAt)
    expire.setMinutes(expire.getMinutes() - expire.getTimezoneOffset())
    state.jobForm.expireTime = expire.toISOString().slice(0, 16)
  } else {
    state.jobForm.expireTime = ''
  }

  state.jobForm.isActive = job.isActive

  let skipHoliday = false
  let skipLeaves = false
  if (job.data) {
    try {
      const parsed =
        typeof job.data === 'string' ? JSON.parse(job.data) : job.data
      skipHoliday = Boolean(parsed?.skipHoliday)
      skipLeaves = Boolean(parsed?.skipLeaves)
    } catch (error) {
      console.warn('Failed to parse job data:', error)
    }
  }

  state.jobForm.skipHoliday = skipHoliday
  state.jobForm.skipLeaves = skipLeaves
}

async function deleteJob(job) {
  if (!job || !job.id) {
    return
  }

  const jobLabel = jobTypeLabel(job.type)
  const confirmed =
    typeof confirm === 'function'
      ? confirm(`確定要刪除「${jobLabel}」排程 (ID: ${job.id}) 嗎？`)
      : true

  if (!confirmed) {
    return
  }

  updateJobMeta(job.id, { __deleting: true })

  try {
    const response = await apiCall(`/api/jobs/${job.id}`, 'DELETE')

    if (response.success) {
      state.jobs = state.jobs.filter((item) => item.id !== job.id)
      if (state.jobs.length === 0) {
        state.jobEmptyMessage = '目前沒有排程'
      }

      state.statusJobs = state.statusJobs.filter(
        (item) => item.id !== job.id
      )
      if (state.statusJobs.length === 0) {
        state.statusEmptyMessage = '目前沒有排程'
      }

      if (state.editingJobId === job.id) {
        hideAddJobForm()
      }

      showStatus('job', '排程已刪除', 'success')

      if (state.activeTab === 'status') {
        await loadJobStatus()
      }
    } else {
      throw new Error(response.error?.message || '刪除排程失敗')
    }
  } catch (error) {
    console.error('Delete job failed:', error)
    showStatus('job', error.message, 'error')
  } finally {
    updateJobMeta(job.id, { __deleting: false })
  }
}

async function toggleJobStatus(job) {
  try {
    const targetStatus = !job.isActive
    const response = await apiCall(`/api/jobs/${job.id}`, 'PUT', {
      isActive: targetStatus,
    })

    if (response.success) {
      job.isActive = targetStatus
      showStatus('job', `排程已${targetStatus ? '啟用' : '停用'}`, 'success')
      if (state.activeTab === 'status') {
        await loadJobStatus()
      }
    } else {
      throw new Error(response.error?.message || '更新排程狀態失敗')
    }
  } catch (error) {
    console.error('Toggle job status failed:', error)
    showStatus('job', error.message, 'error')
  }
}

async function loadJobs() {
  if (!state.authToken) {
    state.jobEmptyMessage = '請登入後管理排程'
    state.jobs = []
    return
  }

  state.loading.jobs = true
  state.jobEmptyMessage = '載入排程中...'
  try {
    const response = await apiCall('/api/jobs', 'GET')
    if (response.success) {
      state.jobs = response.result?.jobs || []
      if (state.jobs.length === 0) {
        state.jobEmptyMessage = '目前沒有排程'
      }
    } else {
      throw new Error(response.error?.message || '載入排程失敗')
    }
  } catch (error) {
    console.error('Load jobs failed:', error)
    state.jobs = []
    state.jobEmptyMessage = '載入排程失敗'
    showStatus('job', error.message, 'error')
  } finally {
    state.loading.jobs = false
  }
}

async function loadJobStatus() {
  if (!state.authToken) {
    state.statusEmptyMessage = '請登入以檢視排程狀態'
    state.statusJobs = []
    state.statusOverview.totalJobs = '-'
    state.statusOverview.activeJobs = '-'
    state.statusOverview.lastExecution = '-'
    return
  }

  state.loading.status = true
  state.statusEmptyMessage = '載入狀態中...'
  try {
    const response = await apiCall('/api/jobs', 'GET')
    if (response.success) {
      const jobsData = response.result?.jobs || []
      state.statusJobs = jobsData
      updateStatusOverview(jobsData)
      if (jobsData.length === 0) {
        state.statusEmptyMessage = '目前沒有排程'
      }
    } else {
      throw new Error(response.error?.message || '載入排程狀態失敗')
    }
  } catch (error) {
    console.error('Load job status failed:', error)
    state.statusJobs = []
    state.statusEmptyMessage = '載入狀態失敗'
    showStatus('statusTab', error.message, 'error')
  } finally {
    state.loading.status = false
  }
}

function updateStatusOverview(list) {
  state.statusOverview.totalJobs = list.length
  state.statusOverview.activeJobs = list.filter((job) => job.isActive).length

  const executed = list.filter((job) => job.lastExecutedAt)
  if (executed.length > 0) {
    const mostRecent = executed.reduce((latest, job) => {
      return new Date(job.lastExecutedAt) > new Date(latest.lastExecutedAt)
        ? job
        : latest
    })
    state.statusOverview.lastExecution = formatDateTime(mostRecent.lastExecutedAt)
  } else {
    state.statusOverview.lastExecution = '-'
  }
}

async function loadTelegramTokens() {
  if (!state.authToken) {
    state.telegramTokens = []
    state.telegramEmptyMessage = '請登入後管理 Telegram Token'
    return
  }

  state.loading.telegram = true
  state.telegramEmptyMessage = '載入中...'
  try {
    const response = await apiCall('/api/telegram/tokens', 'GET')
    if (response.success) {
      state.telegramTokens = (response.result?.tokens || []).map((token) => ({
        ...token,
      }))
      if (state.telegramTokens.length === 0) {
        state.telegramEmptyMessage = '尚未設定任何 Telegram Token'
      }
    } else {
      throw new Error(response.error?.message || '載入 Telegram Token 失敗')
    }
  } catch (error) {
    console.error('Load Telegram tokens failed:', error)
    state.telegramTokens = []
    state.telegramEmptyMessage = '載入失敗'
    showStatus('telegram', error.message, 'error')
  } finally {
    state.loading.telegram = false
  }
}

function showTelegramTokenForm(token = null) {
  if (token) {
    state.editingTelegramId = token.id
    state.telegramForm.name = token.name || ''
    state.telegramForm.botToken = token.botToken || ''
    state.telegramForm.chatId =
      typeof token.chatId === 'number'
        ? String(token.chatId)
        : token.chatId || ''
    state.telegramForm.isActive = Boolean(token.isActive)
  } else {
    state.editingTelegramId = null
    resetTelegramForm()
  }

  state.isTelegramFormVisible = true
}

function hideTelegramTokenForm() {
  state.isTelegramFormVisible = false
  state.editingTelegramId = null
  resetTelegramForm()
}

async function saveTelegramToken() {
  if (!state.telegramForm.botToken || !state.telegramForm.chatId) {
    showStatus('telegram', '請填寫 Bot Token 與 Chat ID', 'error')
    return
  }

  state.loading.telegramSave = true
  try {
    const isEditing = state.editingTelegramId !== null
    const payload = {
      name: state.telegramForm.name || null,
      botToken: state.telegramForm.botToken,
      chatId: state.telegramForm.chatId,
      isActive: state.telegramForm.isActive,
    }
    const endpoint = isEditing
      ? `/api/telegram/tokens/${state.editingTelegramId}`
      : '/api/telegram/tokens'
    const method = isEditing ? 'PUT' : 'POST'

    const response = await apiCall(endpoint, method, payload)

    if (response.success) {
      showStatus(
        'telegram',
        isEditing ? 'Token 已更新' : 'Token 已建立',
        'success'
      )
      hideTelegramTokenForm()
      await loadTelegramTokens()
    } else {
      throw new Error(
        response.error?.message || '儲存 Telegram Token 失敗'
      )
    }
  } catch (error) {
    console.error('Save Telegram token failed:', error)
    showStatus('telegram', '儲存失敗：' + error.message, 'error')
  } finally {
    state.loading.telegramSave = false
  }
}

async function deleteTelegramToken(token) {
  const confirmed =
    typeof confirm === 'function'
      ? confirm(`確定要刪除「${token.name || '未命名 Token'}」嗎？`)
      : true

  if (!confirmed) {
    return
  }

  updateTelegramTokenMeta(token.id, { __deleting: true })

  try {
    const response = await apiCall(
      `/api/telegram/tokens/${token.id}`,
      'DELETE'
    )

    if (response.success) {
      showStatus('telegram', 'Token 已刪除', 'success')
      await loadTelegramTokens()
    } else {
      throw new Error(
        response.error?.message || '刪除 Telegram Token 失敗'
      )
    }
  } catch (error) {
    console.error('Delete Telegram token failed:', error)
    showStatus('telegram', '刪除失敗：' + error.message, 'error')
    updateTelegramTokenMeta(token.id, { __deleting: false })
  }
}

async function sendTelegramTest(token) {
  let customMessage = ''
  if (typeof prompt === 'function') {
    const input = prompt('請輸入測試訊息（可留空使用預設）')
    if (input === null) {
      return
    }
    customMessage = input.trim()
  }

  updateTelegramTokenMeta(token.id, { __testing: true })

  try {
    const response = await apiCall(
      `/api/telegram/tokens/${token.id}/test`,
      'POST',
      customMessage ? { message: customMessage } : null
    )

    if (response.success) {
      showStatus(
        'telegram',
        `已發送測試訊息至 ${token.chatId || '-'}`,
        'success'
      )
    } else {
      throw new Error(
        response.error?.message || '發送測試訊息失敗'
      )
    }
  } catch (error) {
    console.error('Send Telegram test failed:', error)
    showStatus(
      'telegram',
      '測試訊息發送失敗：' + error.message,
      'error'
    )
  } finally {
    updateTelegramTokenMeta(token.id, { __testing: false })
  }
}

function updateJobMeta(id, partial) {
  state.jobs = state.jobs.map((job) =>
    job.id === id ? { ...job, ...partial } : job
  )
}

function updateTelegramTokenMeta(id, partial) {
  state.telegramTokens = state.telegramTokens.map((token) =>
    token.id === id ? { ...token, ...partial } : token
  )
}

async function apiCall(endpoint, method = 'GET', data = null) {
  if (!state.serverUrl) {
    throw new Error('請先設定伺服器位址')
  }

  const url = `${state.serverUrl}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
  }

  if (state.authToken) {
    headers.Authorization = `Bearer ${state.authToken}`
  }

  const options = {
    method,
    headers,
  }

  if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
    options.body = JSON.stringify(data)
  }

  debugLog('API call', {
    url,
    method,
    hasAuth: !!state.authToken,
  })

  sendToBackground('API_CALL', {
    endpoint,
    method,
    hasAuth: !!state.authToken,
    hasData: !!data,
  })

  const response = await fetch(url, options)
  const contentType = response.headers.get('content-type')

  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(
      `Server returned non-JSON response: ${response.status} ${response.statusText}`
    )
  }

  const result = await response.json()

  debugLog('API response', {
    status: response.status,
    success: result.success,
    url,
  })

  return result
}

function showStatus(key, message, type = 'info') {
  const status = state.statuses[key]
  if (!status) return

  status.message = message
  status.type = type
  status.visible = true

  if (statusTimers.has(key)) {
    clearTimeout(statusTimers.get(key))
  }

  const timer = setTimeout(() => {
    status.visible = false
    statusTimers.delete(key)
  }, 5000)

  statusTimers.set(key, timer)
  debugLog('Status shown', { key, message, type })
}

function navigateAfterAuth() {
  if (!routerRef.value) return
  state.activeTab = VALID_TABS.includes(state.lastView.tab)
    ? state.lastView.tab
    : 'status'
  routerRef.value.push({ name: 'dashboard' })
}

async function storageGet(keys) {
  if (hasChromeStorage) {
    return chromeStorageGet(keys)
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  const data = raw ? JSON.parse(raw) : {}

  if (!keys) {
    return data
  }

  if (Array.isArray(keys)) {
    return keys.reduce((acc, key) => {
      acc[key] = data[key]
      return acc
    }, {})
  }

  if (typeof keys === 'string') {
    return { [keys]: data[keys] }
  }

  if (keys && typeof keys === 'object') {
    return Object.keys(keys).reduce((acc, key) => {
      acc[key] = data[key] ?? keys[key]
      return acc
    }, {})
  }

  return data
}

async function storageSet(values) {
  if (hasChromeStorage) {
    return chromeStorageSet(values)
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  const data = raw ? JSON.parse(raw) : {}
  Object.assign(data, values)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

async function persistLocal(payload) {
  try {
    await storageSet(payload)
  } catch (error) {
    console.error('Persist local failed:', error)
  }
}

function chromeStorageGet(keys) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(keys, (result) => {
        const error = chrome.runtime?.lastError
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      })
    } catch (error) {
      reject(error)
    }
  })
}

function chromeStorageSet(values) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.set(values, () => {
        const error = chrome.runtime?.lastError
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    } catch (error) {
      reject(error)
    }
  })
}

function chromeCookiesGetAll(filter) {
  return new Promise((resolve, reject) => {
    try {
      chrome.cookies.getAll(filter, (cookies) => {
        const error = chrome.runtime?.lastError
        if (error) {
          reject(error)
        } else {
          resolve(cookies)
        }
      })
    } catch (error) {
      reject(error)
    }
  })
}

function formatJobTime(value, fallback = '-') {
  if (!value) return fallback
  if (typeof value === 'string' && TIME_PATTERN.test(value)) {
    return value
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`
}

function normalizeTimeInput(value) {
  if (!value) return ''
  if (typeof value === 'string' && TIME_PATTERN.test(value)) {
    return value
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`
}

function formatDateTime(value) {
  if (!value) return '-'
  if (typeof value === 'string' && TIME_PATTERN.test(value)) {
    return value
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatExecutionInfo(job) {
  if (!job.lastExecutedAt) {
    return '尚未執行'
  }

  const status = job.lastExecutionStatus || 'UNKNOWN'
  const statusTexts = {
    SUCCESS: '成功',
    FAILED: '失敗',
    SKIPPED: '跳過',
    UNKNOWN: '未知',
  }

  const statusText = statusTexts[status] || status
  return `${formatDateTime(job.lastExecutedAt)} - ${statusText}`
}

function jobStatusLabel(job) {
  if (!job) {
    return '未知'
  }

  const status = job.lastExecutionStatus || null

  const statusTexts = {
    SUCCESS: '成功',
    FAILED: '失敗',
    SKIPPED: '跳過',
    PENDING: '等待中',
    UNKNOWN: '未知',
  }

  if (!status) {
    return '尚未執行'
  }

  const normalized = status.toUpperCase()
  return statusTexts[normalized] || normalized
}

function jobTypeLabel(type) {
  return type === 'CHECK_IN' ? '上班打卡' : '下班打卡'
}

function maskSensitiveValue(value) {
  if (!value) {
    return '-'
  }

  const text = String(value)
  if (text.length <= 8) {
    return '****'
  }

  return `${text.slice(0, 4)}...${text.slice(-4)}`
}

function base64UrlDecode(str) {
  let input = str
  input = (input + '===').slice(0, input.length + (input.length % 4))
  input = input.replace(/-/g, '+').replace(/_/g, '/')
  return atob(input)
}

function decodeJWT(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }
    return JSON.parse(base64UrlDecode(parts[1]))
  } catch (error) {
    console.error('JWT decode error:', error)
    return null
  }
}

function sendToBackground(type, data) {
  if (!hasChromeRuntime) return
  try {
    chrome.runtime.sendMessage({ type, data }, () => {
      if (chrome.runtime.lastError) {
        console.warn(
          'Background script not responding:',
          chrome.runtime.lastError
        )
      }
    })
  } catch (error) {
    console.warn('Failed to send message to background:', error)
  }
}

function debugLog(message, data = null) {
  console.log(`[Apollo Auto Popup] ${message}`, data)
  sendToBackground('DEBUG_LOG', {
    timestamp: new Date().toISOString(),
    source: 'popup',
    message,
    data,
  })
}

function createJobFormState() {
  return {
    type: 'CHECK_IN',
    startTime: '',
    endTime: '',
    expireTime: '',
    skipHoliday: false,
    skipLeaves: false,
    isActive: true,
  }
}

function resetJobForm() {
  Object.assign(state.jobForm, createJobFormState())
}

function createStatusesState() {
  return {
    login: createStatusState(),
    register: createStatusState(),
    settings: createStatusState(),
    job: createStatusState(),
    statusTab: createStatusState(),
    cookie: createStatusState(),
    telegram: createStatusState(),
  }
}

function createStatusState() {
  return { visible: false, message: '', type: 'info' }
}

function createLoadingState() {
  return {
    login: false,
    register: false,
    settings: false,
    jobs: false,
    status: false,
    jobForm: false,
    cookies: false,
    cookieUpload: false,
    telegram: false,
    telegramSave: false,
  }
}

function createCookieState() {
  return {
    output: '點擊上方按鈕提取 cookies...',
    jsonString: null,
    copyDisabled: true,
    uploadDisabled: true,
  }
}

function createTelegramFormState() {
  return {
    name: '',
    botToken: '',
    chatId: '',
    isActive: true,
  }
}

function resetTelegramForm() {
  Object.assign(state.telegramForm, createTelegramFormState())
}
