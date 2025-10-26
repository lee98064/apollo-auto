const TIME_PATTERN = /^\d{2}:\d{2}$/

class ApolloAutoExtension {
  constructor() {
    this.debugLog('Extension initialized')
    this.init()
  }

  async init() {
    await this.loadSettings()
    this.setupEventListeners()
    this.checkAuthStatus()

    // Setup tab functionality
    this.setupTabs()

    // Initialize job management
    this.currentJobs = []
    this.editingJobId = null

    // Initialize Telegram token management
    this.telegramTokens = []
    this.editingTelegramTokenId = null
  }

  async loadSettings() {
    try {
      const settings = await chrome.storage.local.get([
        'authToken',
        'serverUrl',
        'currentUser',
      ])

      this.authToken = settings.authToken || null
      this.serverUrl = settings.serverUrl || 'http://localhost:5566'
      this.currentUser = settings.currentUser || null

      document.getElementById('serverUrl').value = this.serverUrl

      this.debugLog('Settings loaded:', {
        hasToken: !!this.authToken,
        serverUrl: this.serverUrl,
        hasUser: !!this.currentUser,
      })
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({
        authToken: this.authToken,
        serverUrl: this.serverUrl,
        currentUser: this.currentUser,
      })
      this.debugLog('Settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  checkAuthStatus() {
    this.debugLog('Checking auth status', {
      hasToken: !!this.authToken,
      hasUser: !!this.currentUser,
    })

    if (this.authToken && this.currentUser) {
      this.showMainPage()
    } else {
      this.showLoginPage()
    }
  }

  setupTabs() {
    const statusTab = document.getElementById('statusTab')
    const cookieTab = document.getElementById('cookieTab')
    const telegramTab = document.getElementById('telegramTab')
    const jobTab = document.getElementById('jobTab')

    statusTab.addEventListener('click', () => {
      this.switchTab('status')
    })

    cookieTab.addEventListener('click', () => {
      this.switchTab('cookie')
    })

    telegramTab.addEventListener('click', () => {
      this.switchTab('telegram')
    })

    jobTab.addEventListener('click', () => {
      this.switchTab('job')
    })
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach((btn) => {
      btn.classList.remove('active')
    })
    document.getElementById(tabName + 'Tab').classList.add('active')

    // Update tab content
    document.querySelectorAll('.tab-content').forEach((content) => {
      content.classList.remove('active')
    })
    document.getElementById(tabName + 'Content').classList.add('active')

    this.debugLog('Switched to tab:', tabName)

    // Load appropriate content based on tab
    if (tabName === 'status') {
      this.loadJobStatus()
    } else if (tabName === 'telegram') {
      this.loadTelegramTokens()
    } else if (tabName === 'job') {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        this.loadJobs()
      }, 100)
    }
  }

  setupEventListeners() {
    // Settings
    document
      .getElementById('saveSettings')
      .addEventListener('click', () => this.saveSettingsHandler())
    document.getElementById('settingsBackBtn').addEventListener('click', () => {
      if (this.authToken && this.currentUser) {
        this.showMainPage()
      } else {
        this.showLoginPage()
      }
    })

    // Navigation
    document
      .getElementById('loginSettingsBtn')
      .addEventListener('click', () => this.showSettingsPage())
    document
      .getElementById('mainSettingsBtn')
      .addEventListener('click', () => this.showSettingsPage())
    document
      .getElementById('showRegisterBtn')
      .addEventListener('click', () => this.showRegisterPage())
    document
      .getElementById('registerBackBtn')
      .addEventListener('click', () => this.showLoginPage())
    document
      .getElementById('backToLoginLink')
      .addEventListener('click', () => this.showLoginPage())

    // Auth
    document
      .getElementById('loginBtn')
      .addEventListener('click', () => this.login())
    document
      .getElementById('registerBtn')
      .addEventListener('click', () => this.register())
    document
      .getElementById('logoutBtn')
      .addEventListener('click', () => this.logout())

    // Cookie management
    document
      .getElementById('extractBtn')
      .addEventListener('click', () => this.extractCookies())
    document
      .getElementById('copyBtn')
      .addEventListener('click', () => this.copyCookies())
    document
      .getElementById('uploadBtn')
      .addEventListener('click', () => this.uploadCookies())

    // Job management
    document
      .getElementById('addJobBtn')
      .addEventListener('click', () => this.showAddJobForm())
    document
      .getElementById('createJobBtn')
      .addEventListener('click', () => this.createJob())
    document
      .getElementById('cancelJobBtn')
      .addEventListener('click', () => this.hideAddJobForm())

    // Telegram token management
    const addTelegramTokenBtn = document.getElementById('addTelegramTokenBtn')
    if (addTelegramTokenBtn) {
      addTelegramTokenBtn.addEventListener('click', () =>
        this.showTelegramTokenForm()
      )
    }

    const cancelTelegramTokenBtn = document.getElementById(
      'cancelTelegramTokenBtn'
    )
    if (cancelTelegramTokenBtn) {
      cancelTelegramTokenBtn.addEventListener('click', () =>
        this.hideTelegramTokenForm()
      )
    }

    const saveTelegramTokenBtn = document.getElementById(
      'saveTelegramTokenBtn'
    )
    if (saveTelegramTokenBtn) {
      saveTelegramTokenBtn.addEventListener('click', () =>
        this.saveTelegramToken()
      )
    }

    const telegramTokenList = document.getElementById('telegramTokenList')
    if (telegramTokenList) {
      telegramTokenList.addEventListener('click', (event) =>
        this.handleTelegramTokenListClick(event)
      )
    }

    this.debugLog('Event listeners setup complete')
  }

  showPage(pageId) {
    document.querySelectorAll('.page').forEach((page) => {
      page.style.display = 'none'
    })
    document.getElementById(pageId).style.display = 'block'
    this.debugLog('Showing page:', pageId)
  }

  showSettingsPage() {
    this.showPage('settingsPage')
  }

  showLoginPage() {
    this.showPage('loginPage')
  }

  showRegisterPage() {
    this.showPage('registerPage')
  }

  showMainPage() {
    this.showPage('mainPage')
    this.updateUserInfo()
    // Load appropriate content based on active tab
    if (document.getElementById('statusTab').classList.contains('active')) {
      this.loadJobStatus()
    } else if (
      document.getElementById('telegramTab').classList.contains('active')
    ) {
      this.loadTelegramTokens()
    } else if (document.getElementById('jobTab').classList.contains('active')) {
      this.loadJobs()
    }
  }

  updateUserInfo() {
    if (this.currentUser) {
      this.debugLog('Updating user info display')
      const displayName =
        this.currentUser.displayName || this.currentUser.account || '未知使用者'
      document.getElementById('userName').textContent = `您好，${displayName}`
    }
  }

  // Job Management Functions
  async loadJobs() {
    try {
      this.debugLog('Loading jobs')
      const response = await this.apiCall('/api/jobs', 'GET')

      if (response.success) {
        this.currentJobs = response.result?.jobs || []
        this.renderJobs()
        this.debugLog('Jobs loaded successfully', {
          count: this.currentJobs.length,
        })
      } else {
        throw new Error(response.error?.message || '載入排程失敗')
      }
    } catch (error) {
      console.error('Load jobs failed:', error)
      this.showStatus('jobStatus', '載入排程失敗：' + error.message, 'error')
      this.renderEmptyState('載入排程失敗')
    }
  }

  renderJobs() {
    const jobList = document.getElementById('jobList')
    const emptyState = document.getElementById('jobEmptyState')

    // Check if elements exist before proceeding
    if (!jobList || !emptyState) {
      this.debugLog('Job management elements not found, skipping render')
      return
    }

    if (this.currentJobs.length === 0) {
      this.renderEmptyState('目前沒有排程')
      return
    }

    emptyState.style.display = 'none'

    const jobsHtml = this.currentJobs
      .map((job) => this.renderJobCard(job))
      .join('')
    jobList.innerHTML = jobsHtml

    // Add event listeners for job actions
    this.setupJobEventListeners()
  }

  renderJobCard(job) {
    const statusClass = job.isActive ? 'active' : 'inactive'
    const statusText = job.isActive ? '啟用' : '停用'
    const typeText = job.type === 'CHECK_IN' ? '上班打卡' : '下班打卡'

    const startDisplay = this.formatJobTime(job.startAt, '未設定')
    const endDisplay = this.formatJobTime(job.endAt, '未設定')
    const expiredDisplay = job.expiredAt
      ? this.formatDateTime(job.expiredAt)
      : '未設定'

    return `
      <div class="job-card" data-job-id="${job.id}">
        <div class="job-header">
          <div class="job-title">${typeText}</div>
          <div class="job-status ${statusClass}">${statusText}</div>
        </div>
        <div class="job-details">
          <div class="job-detail">
            <div class="job-detail-label">開始時間</div>
            <div class="job-detail-value">${startDisplay}</div>
          </div>
          <div class="job-detail">
            <div class="job-detail-label">結束時間</div>
            <div class="job-detail-value">${endDisplay}</div>
          </div>
          <div class="job-detail">
            <div class="job-detail-label">過期時間</div>
            <div class="job-detail-value">${expiredDisplay}</div>
          </div>
          <div class="job-detail">
            <div class="job-detail-label">狀態</div>
            <div class="job-detail-value">${job.status || '未知'}</div>
          </div>
        </div>
        <div class="job-actions">
          <button class="button small ${job.isActive ? 'warning' : 'success'} toggle-job-btn"
                  data-job-id="${job.id}" data-is-active="${job.isActive}">
            ${job.isActive ? '停用' : '啟用'}
          </button>
          <button class="button small secondary edit-job-btn" data-job-id="${job.id}">編輯</button>
        </div>
      </div>
    `
  }

  renderEmptyState(message) {
    const jobList = document.getElementById('jobList')
    const emptyState = document.getElementById('jobEmptyState')

    // Check if elements exist before proceeding
    if (!jobList || !emptyState) {
      this.debugLog('Job management elements not found for empty state')
      return
    }

    emptyState.style.display = 'block'
    emptyState.innerHTML = `
      <div class="empty-state-icon">⏰</div>
      <div>${message}</div>
    `

    // Hide any existing job cards
    const jobCards = jobList.querySelectorAll('.job-card')
    for (const card of jobCards) {
      card.remove()
    }
  }

  setupJobEventListeners() {
    // Remove existing event listeners to prevent duplicates
    const existingToggleBtns = document.querySelectorAll('.toggle-job-btn')
    const existingEditBtns = document.querySelectorAll('.edit-job-btn')

    existingToggleBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const jobId = e.target.getAttribute('data-job-id')
        const isActive = e.target.getAttribute('data-is-active') === 'true'
        this.toggleJobStatus(jobId, !isActive)
      })
    })

    existingEditBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const jobId = e.target.getAttribute('data-job-id')
        this.editJob(jobId)
      })
    })
  }

  showAddJobForm() {
    document.getElementById('addJobForm').style.display = 'block'
    document.getElementById('addJobBtn').style.display = 'none'

    // Set default start time to current time
    const now = new Date()
    const defaultTime = `${now
      .getHours()
      .toString()
      .padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}`
    document.getElementById('jobStartTime').value = defaultTime

    this.editingJobId = null
    this.debugLog('Showing add job form')
  }

  hideAddJobForm() {
    document.getElementById('addJobForm').style.display = 'none'
    document.getElementById('addJobBtn').style.display = 'block'
    this.clearJobForm()
    this.editingJobId = null
    this.debugLog('Hiding add job form')
  }

  clearJobForm() {
    document.getElementById('jobType').value = 'CHECK_IN'
    document.getElementById('jobStartTime').value = ''
    document.getElementById('jobEndTime').value = ''
    document.getElementById('jobExpireTime').value = ''
    document.getElementById('jobSkipHoliday').checked = false
    document.getElementById('jobSkipLeaves').checked = false
    document.getElementById('jobIsActive').checked = true
    document.getElementById('createJobBtn').textContent = '新增排程'
  }

  async createJob() {
    try {
      const createBtn = document.getElementById('createJobBtn')
      createBtn.disabled = true
      const isEditing = this.editingJobId !== null
      createBtn.textContent = isEditing ? '更新中...' : '新增中...'

      const startTime = document.getElementById('jobStartTime').value
      const endTime = document.getElementById('jobEndTime').value
      const expireTime = document.getElementById('jobExpireTime').value

      // Validate required fields
      if (!startTime) {
        throw new Error('請選擇開始時間')
      }

      // Collect execution settings
      const skipHoliday = document.getElementById('jobSkipHoliday').checked
      const skipLeaves = document.getElementById('jobSkipLeaves').checked

      const jobData = {
        type: document.getElementById('jobType').value,
        startAt: startTime.trim(),
        endAt: endTime ? endTime.trim() : null,
        expiredAt: expireTime ? new Date(expireTime).toISOString() : null,
        isActive: document.getElementById('jobIsActive').checked,
        data: JSON.stringify({
          skipHoliday,
          skipLeaves,
        }),
      }

      if (!TIME_PATTERN.test(jobData.startAt)) {
        throw new Error('開始時間格式需為 HH:mm')
      }

      if (jobData.endAt && !TIME_PATTERN.test(jobData.endAt)) {
        throw new Error('結束時間格式需為 HH:mm')
      }

      this.debugLog(isEditing ? 'Updating job:' : 'Creating job:', jobData)

      const method = isEditing ? 'PUT' : 'POST'
      const endpoint = isEditing
        ? `/api/jobs/${this.editingJobId}`
        : '/api/jobs'
      const response = await this.apiCall(endpoint, method, jobData)

      if (response.success) {
        this.showStatus(
          'jobStatus',
          `排程${isEditing ? '更新' : '新增'}成功！`,
          'success'
        )
        this.hideAddJobForm()
        this.loadJobs() // Reload jobs list
      } else {
        throw new Error(
          response.error?.message || `${isEditing ? '更新' : '新增'}排程失敗`
        )
      }
    } catch (error) {
      console.error('Create/Update job failed:', error)
      this.showStatus('jobStatus', error.message, 'error')
    } finally {
      const createBtn = document.getElementById('createJobBtn')
      createBtn.disabled = false
      createBtn.textContent = '新增排程'
    }
  }

  async toggleJobStatus(jobId, isActive) {
    try {
      const numericJobId = parseInt(jobId, 10)
      this.debugLog('Toggling job status:', { jobId: numericJobId, isActive })

      const response = await this.apiCall(`/api/jobs/${numericJobId}`, 'PUT', {
        isActive,
      })

      if (response.success) {
        // Update the job in currentJobs array
        const jobIndex = this.currentJobs.findIndex(
          (j) => j.id === numericJobId
        )
        if (jobIndex !== -1) {
          this.currentJobs[jobIndex].isActive = isActive
        }

        // Update the button UI immediately
        this.updateToggleButton(numericJobId, isActive)

        this.showStatus(
          'jobStatus',
          `排程已${isActive ? '啟用' : '停用'}`,
          'success'
        )

        // Only reload if we couldn't find the job locally
        if (jobIndex === -1) {
          this.loadJobs()
        }
      } else {
        throw new Error(response.error?.message || '更新排程狀態失敗')
      }
    } catch (error) {
      console.error('Toggle job status failed:', error)
      this.showStatus('jobStatus', error.message, 'error')
    }
  }

  updateToggleButton(jobId, isActive) {
    const button = document.querySelector(
      `[data-job-id="${jobId}"].toggle-job-btn`
    )
    if (button) {
      // Update button text
      button.textContent = isActive ? '停用' : '啟用'

      // Update button classes
      button.classList.remove('success', 'warning')
      button.classList.add(isActive ? 'warning' : 'success')

      // Update data attribute
      button.setAttribute('data-is-active', isActive.toString())

      this.debugLog('Updated toggle button for job:', { jobId, isActive })
    }
  }

  async editJob(jobId) {
    try {
      const numericJobId = parseInt(jobId, 10)
      const job = this.currentJobs.find((j) => j.id === numericJobId)
      if (!job) {
        throw new Error('找不到指定的排程')
      }

      this.debugLog('Editing job:', job)

      // Fill form with job data
      document.getElementById('jobType').value = job.type

      document.getElementById('jobStartTime').value = this.normalizeTimeInput(
        job.startAt
      )
      document.getElementById('jobEndTime').value = this.normalizeTimeInput(
        job.endAt
      )

      if (job.expiredAt) {
        const expireTime = new Date(job.expiredAt)
        expireTime.setMinutes(
          expireTime.getMinutes() - expireTime.getTimezoneOffset()
        )
        document.getElementById('jobExpireTime').value = expireTime
          .toISOString()
          .slice(0, 16)
      }

      document.getElementById('jobIsActive').checked = job.isActive

      // Parse and populate data settings
      let skipHoliday = false
      let skipLeaves = false

      if (job.data) {
        try {
          const parsedData =
            typeof job.data === 'string' ? JSON.parse(job.data) : job.data
          skipHoliday = Boolean(parsedData?.skipHoliday)
          skipLeaves = Boolean(parsedData?.skipLeaves)
        } catch (error) {
          console.warn('Failed to parse job data:', error)
        }
      }

      document.getElementById('jobSkipHoliday').checked = skipHoliday
      document.getElementById('jobSkipLeaves').checked = skipLeaves

      // Show form and update button text
      document.getElementById('addJobForm').style.display = 'block'
      document.getElementById('addJobBtn').style.display = 'none'
      document.getElementById('createJobBtn').textContent = '更新排程'

      this.editingJobId = numericJobId
    } catch (error) {
      console.error('Edit job failed:', error)
      this.showStatus('jobStatus', error.message, 'error')
    }
  }

  // Telegram Notification Functions
  async loadTelegramTokens() {
    const listElement = document.getElementById('telegramTokenList')
    const emptyState = document.getElementById('telegramEmptyState')

    if (!listElement || !emptyState) {
      this.debugLog('Telegram token elements not found, skipping load')
      return
    }

    if (!this.authToken) {
      this.renderTelegramEmptyState('請登入後管理 Telegram Token')
      return
    }

    try {
      this.debugLog('Loading Telegram tokens')
      const response = await this.apiCall('/api/telegram/tokens', 'GET')

      if (response.success) {
        this.telegramTokens = response.result?.tokens || []
        this.renderTelegramTokens()
      } else {
        throw new Error(response.error?.message || '載入 Telegram Token 失敗')
      }
    } catch (error) {
      console.error('Load Telegram tokens failed:', error)
      this.renderTelegramEmptyState('載入失敗')
      this.showStatus('telegramStatus', error.message, 'error')
    }
  }

  renderTelegramTokens() {
    const listElement = document.getElementById('telegramTokenList')
    const emptyState = document.getElementById('telegramEmptyState')

    if (!listElement || !emptyState) {
      this.debugLog('Telegram token elements not found for render')
      return
    }

    if (!Array.isArray(this.telegramTokens) || this.telegramTokens.length === 0) {
      this.renderTelegramEmptyState('尚未設定任何 Telegram Token')
      return
    }

    emptyState.style.display = 'none'
    listElement.innerHTML = this.telegramTokens
      .map((token) => this.renderTelegramTokenCard(token))
      .join('')
  }

  renderTelegramEmptyState(message) {
    const listElement = document.getElementById('telegramTokenList')
    const emptyState = document.getElementById('telegramEmptyState')

    if (!listElement || !emptyState) {
      this.debugLog('Telegram token elements not found for empty state')
      return
    }

    listElement.innerHTML = ''
    emptyState.style.display = 'block'
    emptyState.innerHTML = `
      <div class="empty-state-icon">📨</div>
      <div>${this.escapeHtml(message)}</div>
    `
  }

  renderTelegramTokenCard(token) {
    const tokenId = Number(token.id)
    const statusClass = token.isActive ? 'badge-success' : 'badge-secondary'
    const statusText = token.isActive ? '啟用' : '停用'
    const displayName =
      typeof token.name === 'string' && token.name.length > 0
        ? this.escapeHtml(token.name)
        : '未命名 Token'
    const maskedToken = this.maskSensitiveValue(token.botToken)
    const chatIdValue =
      typeof token.chatId === 'string'
        ? token.chatId
        : token.chatId != null
          ? String(token.chatId)
          : ''
    const chatId = this.escapeHtml(chatIdValue)

    return `
      <div class="telegram-card" data-token-id="${tokenId}">
        <div class="telegram-card-header">
          <div class="telegram-token-name">${displayName}</div>
          <span class="badge ${statusClass}">${statusText}</span>
        </div>
        <div class="telegram-card-body">
          <div class="telegram-field">
            <span class="label">Bot Token</span>
            <span class="value">${maskedToken}</span>
          </div>
          <div class="telegram-field">
            <span class="label">Chat ID</span>
            <span class="value">${chatId}</span>
          </div>
        </div>
        <div class="telegram-card-actions">
          <button class="button small" data-action="test" data-token-id="${tokenId}">發送測試</button>
          <button class="button small secondary" data-action="edit" data-token-id="${tokenId}">編輯</button>
          <button class="button small danger" data-action="delete" data-token-id="${tokenId}">刪除</button>
        </div>
      </div>
    `
  }

  maskSensitiveValue(value) {
    if (!value) {
      return '-'
    }

    const text = String(value)
    if (text.length <= 8) {
      return '****'
    }

    const masked = `${text.slice(0, 4)}...${text.slice(-4)}`
    return this.escapeHtml(masked)
  }

  showTelegramTokenForm(token = null) {
    const form = document.getElementById('telegramTokenForm')
    const addBtn = document.getElementById('addTelegramTokenBtn')
    const title = document.getElementById('telegramFormTitle')
    const saveBtn = document.getElementById('saveTelegramTokenBtn')
    const nameInput = document.getElementById('telegramTokenName')
    const botTokenInput = document.getElementById('telegramBotToken')
    const chatIdInput = document.getElementById('telegramChatId')
    const isActiveInput = document.getElementById('telegramIsActive')

    if (!form || !addBtn || !saveBtn || !isActiveInput) {
      this.debugLog('Telegram form elements missing, cannot show form')
      return
    }

    form.style.display = 'block'
    addBtn.style.display = 'none'

    this.resetTelegramTokenForm()

    if (!token) {
      if (title) title.textContent = '新增 Telegram Token'
      saveBtn.textContent = '新增'
      if (nameInput) nameInput.value = ''
      if (botTokenInput) botTokenInput.value = ''
      if (chatIdInput) chatIdInput.value = ''
      isActiveInput.checked = true
      return
    }

    this.editingTelegramTokenId = token.id
    if (title) title.textContent = '編輯 Telegram Token'
    saveBtn.textContent = '更新'
    if (nameInput) nameInput.value = token.name || ''
    if (botTokenInput) botTokenInput.value = token.botToken || ''
    if (chatIdInput) chatIdInput.value = token.chatId || ''
    isActiveInput.checked = Boolean(token.isActive)
  }

  hideTelegramTokenForm() {
    const form = document.getElementById('telegramTokenForm')
    const addBtn = document.getElementById('addTelegramTokenBtn')
    const title = document.getElementById('telegramFormTitle')
    const saveBtn = document.getElementById('saveTelegramTokenBtn')

    if (form) form.style.display = 'none'
    if (addBtn) addBtn.style.display = 'block'
    if (title) title.textContent = '新增 Telegram Token'
    if (saveBtn) saveBtn.textContent = '新增'

    this.resetTelegramTokenForm()
  }

  resetTelegramTokenForm() {
    const nameInput = document.getElementById('telegramTokenName')
    const botTokenInput = document.getElementById('telegramBotToken')
    const chatIdInput = document.getElementById('telegramChatId')
    const isActiveInput = document.getElementById('telegramIsActive')

    if (nameInput) nameInput.value = ''
    if (botTokenInput) botTokenInput.value = ''
    if (chatIdInput) chatIdInput.value = ''
    if (isActiveInput) isActiveInput.checked = true

    this.editingTelegramTokenId = null
  }

  async saveTelegramToken() {
    const saveBtn = document.getElementById('saveTelegramTokenBtn')
    const nameInput = document.getElementById('telegramTokenName')
    const botTokenInput = document.getElementById('telegramBotToken')
    const chatIdInput = document.getElementById('telegramChatId')
    const isActiveInput = document.getElementById('telegramIsActive')

    if (!saveBtn || !botTokenInput || !chatIdInput || !isActiveInput) {
      this.debugLog('Telegram form inputs missing, cannot save')
      return
    }

    const nameValue = nameInput ? nameInput.value.trim() : ''
    const botToken = botTokenInput.value.trim()
    const chatId = chatIdInput.value.trim()
    const isActive = isActiveInput.checked

    if (!botToken || !chatId) {
      this.showStatus('telegramStatus', '請填寫 Bot Token 與 Chat ID', 'error')
      return
    }

    const payload = {
      name: nameValue.length > 0 ? nameValue : null,
      botToken,
      chatId,
      isActive,
    }

    const isEditing = Boolean(this.editingTelegramTokenId)
    const originalText = saveBtn.textContent
    saveBtn.disabled = true
    saveBtn.textContent = isEditing ? '儲存中...' : '新增中...'

    try {
      const endpoint = isEditing
        ? `/api/telegram/tokens/${this.editingTelegramTokenId}`
        : '/api/telegram/tokens'

      const method = isEditing ? 'PUT' : 'POST'
      const response = await this.apiCall(endpoint, method, payload)

      if (!response.success) {
        throw new Error(
          response.error?.message || '儲存 Telegram Token 失敗'
        )
      }

      this.showStatus(
        'telegramStatus',
        isEditing ? 'Token 已更新' : 'Token 已建立',
        'success'
      )
      this.hideTelegramTokenForm()
      await this.loadTelegramTokens()
    } catch (error) {
      console.error('Save Telegram token failed:', error)
      this.showStatus(
        'telegramStatus',
        '儲存失敗：' + error.message,
        'error'
      )
    } finally {
      saveBtn.disabled = false
      saveBtn.textContent = originalText
    }
  }

  handleTelegramTokenListClick(event) {
    const button = event.target.closest('button[data-action]')
    if (!button) {
      return
    }

    const tokenId = parseInt(button.getAttribute('data-token-id') || '', 10)
    if (Number.isNaN(tokenId)) {
      return
    }

    const action = button.getAttribute('data-action')
    if (action === 'edit') {
      this.editTelegramToken(tokenId)
    } else if (action === 'delete') {
      this.deleteTelegramToken(tokenId, button)
    } else if (action === 'test') {
      this.sendTelegramTest(tokenId, button)
    }
  }

  editTelegramToken(tokenId) {
    const token = this.telegramTokens.find((item) => item.id === tokenId)
    if (!token) {
      this.showStatus('telegramStatus', '找不到指定的 Token', 'error')
      return
    }
    this.showTelegramTokenForm(token)
  }

  async deleteTelegramToken(tokenId, triggerButton) {
    const token = this.telegramTokens.find((item) => item.id === tokenId)
    if (!token) {
      this.showStatus('telegramStatus', '找不到指定的 Token', 'error')
      return
    }

    const confirmDelete = confirm(
      `確定要刪除「${token.name || '未命名 Token'}」嗎？`
    )
    if (!confirmDelete) {
      return
    }

    if (triggerButton) {
      triggerButton.disabled = true
    }

    try {
      const response = await this.apiCall(
        `/api/telegram/tokens/${tokenId}`,
        'DELETE'
      )

      if (!response.success) {
        throw new Error(
          response.error?.message || '刪除 Telegram Token 失敗'
        )
      }

      this.showStatus('telegramStatus', 'Token 已刪除', 'success')
      await this.loadTelegramTokens()
    } catch (error) {
      console.error('Delete Telegram token failed:', error)
      this.showStatus(
        'telegramStatus',
        '刪除失敗：' + error.message,
        'error'
      )
      if (triggerButton) {
        triggerButton.disabled = false
      }
      return
    }

    if (triggerButton) {
      triggerButton.disabled = false
    }
  }

  async sendTelegramTest(tokenId, triggerButton) {
    const token = this.telegramTokens.find((item) => item.id === tokenId)
    if (!token) {
      this.showStatus('telegramStatus', '找不到指定的 Token', 'error')
      return
    }

    const customMessage = prompt('請輸入測試訊息（可留空使用預設）')
    if (customMessage === null) {
      return
    }

    const payload =
      customMessage && customMessage.trim().length > 0
        ? { message: customMessage.trim() }
        : null

    let originalText = ''
    if (triggerButton) {
      originalText = triggerButton.textContent
      triggerButton.disabled = true
      triggerButton.textContent = '發送中...'
    }

    try {
      const response = await this.apiCall(
        `/api/telegram/tokens/${tokenId}/test`,
        'POST',
        payload
      )

      if (!response.success) {
        throw new Error(
          response.error?.message || '測試訊息發送失敗'
        )
      }

      this.showStatus(
        'telegramStatus',
        `已發送測試訊息至 ${token.chatId}`,
        'success'
      )
    } catch (error) {
      console.error('Send Telegram test message failed:', error)
      this.showStatus(
        'telegramStatus',
        '測試訊息發送失敗：' + error.message,
        'error'
      )
    } finally {
      if (triggerButton) {
        triggerButton.disabled = false
        triggerButton.textContent = originalText || '發送測試'
      }
    }
  }

  escapeHtml(value) {
    if (typeof value !== 'string') {
      return ''
    }

    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  showStatus(elementId, message, type = 'info') {
    const statusElement = document.getElementById(elementId)
    statusElement.textContent = message
    statusElement.className = `status ${type}`
    statusElement.style.display = 'block'

    setTimeout(() => {
      statusElement.style.display = 'none'
    }, 5000)

    this.debugLog('Status shown:', { elementId, message, type })
  }

  // Status Monitoring Functions
  async loadJobStatus() {
    try {
      this.debugLog('Loading job status')

      const response = await this.apiCall('/api/jobs', 'GET')

      if (response.success) {
        const jobs = response.result.jobs || []
        this.updateStatusOverview(jobs)
        this.renderJobStatusList(jobs)
      } else {
        throw new Error(response.error?.message || '載入排程狀態失敗')
      }
    } catch (error) {
      console.error('Load job status failed:', error)
      this.showStatus('statusTabStatus', error.message, 'error')
      this.renderStatusEmptyState('載入狀態失敗')
    }
  }

  updateStatusOverview(jobs) {
    const totalJobs = jobs.length
    const activeJobs = jobs.filter((job) => job.isActive).length

    // Find the most recent execution
    let lastExecution = '-'
    const jobsWithExecution = jobs.filter((job) => job.lastExecutedAt)
    if (jobsWithExecution.length > 0) {
      const mostRecent = jobsWithExecution.reduce((latest, job) => {
        return new Date(job.lastExecutedAt) > new Date(latest.lastExecutedAt)
          ? job
          : latest
      })
      lastExecution = this.formatDateTime(mostRecent.lastExecutedAt)
    }

    // Check if elements exist before updating
    const totalElement = document.getElementById('totalJobs')
    const activeElement = document.getElementById('activeJobs')
    const lastElement = document.getElementById('lastExecution')

    if (totalElement) totalElement.textContent = totalJobs
    if (activeElement) activeElement.textContent = activeJobs
    if (lastElement) lastElement.textContent = lastExecution
  }

  renderJobStatusList(jobs) {
    const statusList = document.getElementById('jobStatusList')
    const emptyState = document.getElementById('statusEmptyState')

    // Check if elements exist before proceeding
    if (!statusList || !emptyState) {
      this.debugLog('Status elements not found, skipping render')
      return
    }

    if (jobs.length === 0) {
      this.renderStatusEmptyState('目前沒有排程')
      return
    }

    emptyState.style.display = 'none'

    const statusHtml = jobs.map((job) => this.renderJobStatusCard(job)).join('')
    statusList.innerHTML = statusHtml
  }

  renderJobStatusCard(job) {
    const statusClass = job.isActive ? 'active' : 'inactive'
    const statusText = job.isActive ? '啟用' : '停用'
    const typeText = job.type === 'CHECK_IN' ? '上班打卡' : '下班打卡'

    let executionInfo = '尚未執行'
    if (job.lastExecutedAt) {
      const status = job.lastExecutionStatus || 'UNKNOWN'
      const statusTexts = {
        SUCCESS: '成功',
        FAILED: '失敗',
        SKIPPED: '跳過',
        UNKNOWN: '未知',
      }
      executionInfo = `${this.formatDateTime(job.lastExecutedAt)} - ${statusTexts[status] || status}`
    }

    let nextExecution = '無'
    if (job.nextExecutionAt) {
      nextExecution = this.formatDateTime(job.nextExecutionAt)
    }

    return `
      <div class="job-status-card ${statusClass}">
        <div class="job-status-header">
          <div class="job-status-title">${typeText} (ID: ${job.id})</div>
          <div class="job-status-badge ${statusClass}">${statusText}</div>
        </div>
        <div class="job-status-info">
          <div>開始時間：${this.formatJobTime(job.startAt, '-')}</div>
          <div>下次執行：${nextExecution}</div>
          <div>上次執行：${executionInfo}</div>
          ${job.expiredAt ? `<div>過期時間：${this.formatDateTime(job.expiredAt)}</div>` : ''}
        </div>
      </div>
    `
  }

  renderStatusEmptyState(message) {
    const statusList = document.getElementById('jobStatusList')
    const emptyState = document.getElementById('statusEmptyState')

    // Check if elements exist before proceeding
    if (!statusList || !emptyState) {
      this.debugLog('Status elements not found for empty state')
      return
    }

    statusList.innerHTML = ''
    emptyState.innerHTML = `
      <div class="empty-state-icon">📊</div>
      <div>${message}</div>
    `
    emptyState.style.display = 'block'
  }

  formatJobTime(value, fallback = '-') {
    if (!value) return fallback
    if (typeof value === 'string' && TIME_PATTERN.test(value)) {
      return value
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return fallback
    }

    return `${date
      .getHours()
      .toString()
      .padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`
  }

  normalizeTimeInput(value) {
    if (!value) return ''
    if (typeof value === 'string' && TIME_PATTERN.test(value)) {
      return value
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return ''
    }

    return `${date
      .getHours()
      .toString()
      .padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`
  }

  formatDateTime(dateString) {
    if (!dateString) return '-'
    if (typeof dateString === 'string' && TIME_PATTERN.test(dateString)) {
      return dateString
    }

    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) {
      return dateString
    }

    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  debugLog(message, data = null) {
    const logData = {
      timestamp: new Date().toISOString(),
      source: 'popup',
      message: message,
      data: data,
    }

    console.log(`[Apollo Auto Popup] ${message}`, data)

    // Send to background script for centralized logging
    this.sendToBackground('DEBUG_LOG', logData)
  }

  sendToBackground(type, data) {
    chrome.runtime.sendMessage({ type, data }, () => {
      if (chrome.runtime.lastError) {
        console.warn(
          'Background script not responding:',
          chrome.runtime.lastError
        )
      }
    })
  }

  // Base64 URL decode function for JWT
  base64UrlDecode(str) {
    str = (str + '===').slice(0, str.length + (str.length % 4))
    str = str.replace(/-/g, '+').replace(/_/g, '/')
    return atob(str)
  }

  // JWT decode function
  decodeJWT(token) {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format')
      }

      const payload = JSON.parse(this.base64UrlDecode(parts[1]))
      return payload
    } catch (error) {
      console.error('JWT decode error:', error)
      return null
    }
  }

  async apiCall(endpoint, method = 'GET', data = null) {
    const url = `${this.serverUrl}${endpoint}`
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (this.authToken) {
      options.headers['Authorization'] = `Bearer ${this.authToken}`
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data)
    }

    this.debugLog('API call:', { url, method, hasAuth: !!this.authToken })

    // 通知 background script API 調用
    this.sendToBackground('API_CALL', {
      endpoint,
      method,
      hasAuth: !!this.authToken,
      hasData: !!data,
    })

    try {
      const response = await fetch(url, options)

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(
          `Server returned non-JSON response: ${response.status} ${response.statusText}`
        )
      }

      const result = await response.json()

      this.debugLog('API response:', {
        status: response.status,
        success: result.success,
        url,
      })

      return result
    } catch (error) {
      this.debugLog('API call failed:', {
        url,
        method,
        error: error.message,
        stack: error.stack,
      })
      throw error
    }
  }

  async saveSettingsHandler() {
    const saveBtn = document.getElementById('saveSettings')
    saveBtn.disabled = true
    saveBtn.textContent = '儲存中...'

    try {
      this.serverUrl = document.getElementById('serverUrl').value
      await this.saveSettings()
      this.showStatus('settingsStatus', '設定已儲存', 'success')
    } catch {
      this.showStatus('settingsStatus', '儲存失敗', 'error')
    } finally {
      saveBtn.disabled = false
      saveBtn.textContent = '儲存設定'
    }
  }

  async login() {
    const loginBtn = document.getElementById('loginBtn')
    const account = document.getElementById('loginAccount').value
    const password = document.getElementById('loginPassword').value

    if (!account || !password) {
      this.showStatus('loginStatus', '請輸入帳號和密碼', 'error')
      return
    }

    loginBtn.disabled = true
    loginBtn.innerHTML = '<span class="loading"></span>登入中...'

    try {
      const response = await this.apiCall('/api/login', 'POST', {
        account,
        password,
      })

      if (response.success) {
        this.debugLog('Login successful, decoding token')

        // Decode JWT to get user info
        const decodedToken = this.decodeJWT(response.result.token)
        if (decodedToken?.user) {
          this.currentUser = decodedToken.user
          this.debugLog('User info extracted from JWT:', this.currentUser)
        } else {
          this.debugLog(
            'Could not extract user info from token, using response'
          )
          this.currentUser = response.result.user || { account }
        }

        this.authToken = response.result.token
        await this.saveSettings()

        // 通知 background script 認證狀態變更
        this.sendToBackground('AUTH_STATE_CHANGED', {
          isLoggedIn: true,
          user: this.currentUser,
          token: this.authToken,
        })

        this.showStatus('loginStatus', '登入成功！', 'success')

        setTimeout(() => {
          this.showMainPage()
        }, 1000)
      } else {
        console.log('Login failed:', response)
        this.showStatus(
          'loginStatus',
          response.error?.message || '登入失敗',
          'error'
        )
      }
    } catch (error) {
      console.error('Login failed:', error)
      this.showStatus('loginStatus', '連線失敗，請檢查伺服器設定', 'error')
    } finally {
      loginBtn.disabled = false
      loginBtn.textContent = '登入'
    }
  }

  async register() {
    const registerBtn = document.getElementById('registerBtn')
    const account = document.getElementById('registerAccount').value
    const password = document.getElementById('registerPassword').value
    const displayName = document.getElementById('registerDisplayName').value
    const timezone = document.getElementById('registerTimezone').value

    if (!account || !password || !displayName) {
      this.showStatus('registerStatus', '請填寫所有必填欄位', 'error')
      return
    }

    registerBtn.disabled = true
    registerBtn.innerHTML = '<span class="loading"></span>註冊中...'

    try {
      const response = await this.apiCall('/api/register', 'POST', {
        account,
        password,
        displayName,
        timezone: timezone || 'Asia/Taipei',
      })

      if (response.success) {
        this.debugLog('Registration successful, decoding token')

        // Decode JWT to get user info
        const decodedToken = this.decodeJWT(response.result.token)
        if (decodedToken?.user) {
          this.currentUser = decodedToken.user
          this.debugLog('User info extracted from JWT:', this.currentUser)
        } else {
          this.debugLog(
            'Could not extract user info from token, using response data'
          )
          this.currentUser = response.result.user || {
            account,
            displayName,
            timezone,
          }
        }

        // 通知 background script 認證狀態變更
        this.sendToBackground('AUTH_STATE_CHANGED', {
          isLoggedIn: true,
          user: this.currentUser,
          token: this.authToken,
        })

        this.authToken = response.result.token
        this.currentUser = response.result.user
        await this.saveSettings()
        this.showStatus('registerStatus', '註冊成功！', 'success')

        setTimeout(() => {
          this.showMainPage()
        }, 1000)
      } else {
        console.log('Registration failed:', response)
        this.showStatus(
          'registerStatus',
          response.error?.message || '註冊失敗',
          'error'
        )
      }
    } catch (error) {
      console.error('Registration failed:', error)
      this.showStatus('registerStatus', '連線失敗，請檢查伺服器設定', 'error')
    } finally {
      registerBtn.disabled = false
      registerBtn.textContent = '註冊'
    }
  }

  async logout() {
    this.debugLog('Logging out user')
    this.authToken = null
    this.currentUser = null
    this.telegramTokens = []
    this.editingTelegramTokenId = null
    this.hideTelegramTokenForm()
    this.renderTelegramEmptyState('請登入後管理 Telegram Token')
    await this.saveSettings()

    // 通知 background script 認證狀態變更
    this.sendToBackground('AUTH_STATE_CHANGED', {
      isLoggedIn: false,
      user: null,
      token: null,
    })

    // Clear form data
    document.getElementById('loginAccount').value = ''
    document.getElementById('loginPassword').value = ''
    document.getElementById('cookieOutput').textContent =
      '點擊上方按鈕提取 cookies...'
    document.getElementById('cookieOutput').className = 'cookie-output empty'
    document.getElementById('copyBtn').disabled = true
    document.getElementById('uploadBtn').disabled = true

    this.debugLog('User logged out, showing login page')
    this.showLoginPage()
  }

  // Cookie management properties and methods
  domain = '.mayohr.com'
  targetCookies = ['__ModuleSessionCookie', '__ModuleSessionCookie2']
  cookieJsonString = null

  async extractCookies() {
    try {
      const extractBtn = document.getElementById('extractBtn')
      extractBtn.disabled = true
      extractBtn.innerHTML = '<span class="loading"></span>提取中...'

      // Get all cookies for mayohr.com domain
      this.debugLog('Fetching cookies for domain:', this.domain)
      const cookies = await chrome.cookies.getAll({
        domain: this.domain,
      })

      this.debugLog('All cookies found:', {
        count: cookies.length,
        names: cookies.map((c) => c.name),
      })

      // Filter for target cookies
      const targetCookies = cookies.filter((cookie) =>
        this.targetCookies.includes(cookie.name)
      )

      this.debugLog('Target cookies found:', {
        count: targetCookies.length,
        names: targetCookies.map((c) => c.name),
        targetNames: this.targetCookies,
      })

      if (targetCookies.length === 0) {
        throw new Error(
          `未找到目標 cookies (${this.targetCookies.join(', ')})。請確保已登入 MayoHR 系統。`
        )
      }

      // Format cookies as JSON array
      const formattedCookies = targetCookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
      }))

      const jsonOutput = JSON.stringify(formattedCookies, null, 2)

      this.cookieOutput = document.getElementById('cookieOutput')
      this.cookieOutput.textContent = jsonOutput
      this.cookieOutput.className = 'cookie-output'

      document.getElementById('copyBtn').disabled = false
      document.getElementById('uploadBtn').disabled = false
      this.showStatus(
        'mainStatus',
        `成功提取 ${targetCookies.length} 個 cookies`,
        'success'
      )

      // Store the JSON string for copying
      this.cookieJsonString = JSON.stringify(formattedCookies)

      // 通知 background script cookies 已提取
      this.sendToBackground('COOKIE_EXTRACTED', {
        count: targetCookies.length,
        cookies: formattedCookies.map((c) => ({
          name: c.name,
          valueLength: c.value?.length || 0,
        })),
      })

      this.debugLog('Cookies extracted successfully', {
        count: targetCookies.length,
      })
    } catch (error) {
      this.debugLog('Cookie extraction failed:', error.message)
      this.showStatus('mainStatus', error.message, 'error')
      this.cookieOutput = document.getElementById('cookieOutput')
      this.cookieOutput.textContent = '提取失敗：' + error.message
      this.cookieOutput.className = 'cookie-output empty'
      document.getElementById('copyBtn').disabled = true
      document.getElementById('uploadBtn').disabled = true
    } finally {
      const extractBtn = document.getElementById('extractBtn')
      extractBtn.disabled = false
      extractBtn.textContent = '提取 MayoHR Cookies'
    }
  }

  async copyCookies() {
    try {
      if (!this.cookieJsonString) {
        throw new Error('沒有可複製的 cookie 數據')
      }

      await navigator.clipboard.writeText(this.cookieJsonString)
      this.showStatus('mainStatus', '已複製到剪貼板！', 'success')

      // Temporarily change button text
      const copyBtn = document.getElementById('copyBtn')
      const originalText = copyBtn.textContent
      copyBtn.textContent = '已複製！'
      setTimeout(() => {
        copyBtn.textContent = originalText
      }, 2000)
    } catch (error) {
      console.error('Copy failed:', error)
      this.showStatus('mainStatus', '複製失敗：' + error.message, 'error')
    }
  }

  async uploadCookies() {
    try {
      if (!this.cookieJsonString) {
        throw new Error('沒有可上傳的 cookie 數據')
      }

      const uploadBtn = document.getElementById('uploadBtn')
      uploadBtn.disabled = true
      uploadBtn.innerHTML = '<span class="loading"></span>上傳中...'

      const response = await this.apiCall('/api/cookies', 'PUT', {
        value: this.cookieJsonString,
      })

      if (response.success) {
        this.showStatus('mainStatus', 'Cookies 已成功上傳至伺服器！', 'success')
      } else {
        throw new Error(response.error?.message || '上傳失敗')
      }
    } catch (error) {
      console.error('Upload failed:', error)
      this.showStatus('mainStatus', '上傳失敗：' + error.message, 'error')
    } finally {
      const uploadBtn = document.getElementById('uploadBtn')
      uploadBtn.disabled = false
      uploadBtn.textContent = '上傳至伺服器'
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ApolloAutoExtension()
})
