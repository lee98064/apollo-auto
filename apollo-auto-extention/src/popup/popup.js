class ApolloAutoExtension {
  constructor() {
    this.targetCookies = ['__ModuleSessionCookie', '__ModuleSessionCookie2']
    this.domain = '.mayohr.com'
    this.currentUser = null
    this.serverUrl = 'http://localhost:5566'
    this.authToken = null

    this.initializeApp()
  }

  // 發送訊息到 background script
  sendToBackground(type, data) {
    try {
      chrome.runtime.sendMessage({ type, data }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            'Error sending message to background:',
            chrome.runtime.lastError
          )
        } else {
          console.log('Message sent to background, response:', response)
        }
      })
    } catch (error) {
      console.error('Failed to send message to background:', error)
    }
  }

  // 調試日誌方法
  debugLog(message, data = null) {
    console.log('[POPUP]', message, data)
    this.sendToBackground('DEBUG_LOG', {
      message,
      data,
      timestamp: new Date().toISOString(),
    })
  }

  // 解碼 JWT token
  decodeJWT(token) {
    try {
      if (!token || typeof token !== 'string') {
        return null
      }

      const parts = token.split('.')
      if (parts.length !== 3) {
        console.error('Invalid JWT format')
        return null
      }

      // 解碼 payload (第二部分)
      const payload = parts[1]
      // 補充 base64 padding 如果需要
      const paddedPayload = payload + '='.repeat((4 - (payload.length % 4)) % 4)
      const decodedPayload = atob(
        paddedPayload.replace(/-/g, '+').replace(/_/g, '/')
      )

      return JSON.parse(decodedPayload)
    } catch (error) {
      console.error('Error decoding JWT:', error)
      return null
    }
  }

  // 從 JWT token 中提取用戶信息
  getUserFromToken() {
    if (!this.authToken) {
      return null
    }

    const decoded = this.decodeJWT(this.authToken)
    if (!decoded) {
      return null
    }

    this.debugLog('Decoded JWT payload:', decoded)

    // 根據後端 JWT 結構，用戶信息在 user 物件中
    if (decoded.user) {
      return {
        id: decoded.user.id,
        account: decoded.user.account,
        displayName: decoded.user.displayName,
        timezone: decoded.user.timezone,
      }
    }

    // 兼容性處理：如果沒有 user 物件，嘗試從根層級獲取
    return {
      id: decoded.id || decoded.userId || decoded.sub,
      account: decoded.account || decoded.username || decoded.email,
      displayName: decoded.displayName || decoded.name || decoded.account,
      timezone: decoded.timezone,
    }
  }

  async initializeApp() {
    this.debugLog('Initializing Apollo Auto Extension')
    await this.loadSettings()
    await this.checkAuthState()
    this.initializeUI()
    this.debugLog('Extension initialization complete')
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get([
        'serverUrl',
        'authToken',
        'currentUser',
      ])
      console.log('Loaded settings from storage:', result)

      if (result.serverUrl) {
        this.serverUrl = result.serverUrl
        console.log('Server URL loaded:', this.serverUrl)
      }
      if (result.authToken) {
        this.authToken = result.authToken
        console.log(
          'Auth token loaded:',
          this.authToken ? 'present' : 'missing'
        )
      }
      if (result.currentUser) {
        this.currentUser = result.currentUser
        console.log('Current user loaded:', this.currentUser)
      } else if (result.authToken) {
        // 如果沒有儲存的用戶信息但有 token，嘗試從 token 中提取
        const userFromToken = this.getUserFromToken()
        if (userFromToken) {
          this.currentUser = userFromToken
          console.log('Current user extracted from token:', this.currentUser)
          // 儲存提取出的用戶信息以供下次使用
          this.saveSettings()
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  async saveSettings() {
    try {
      const data = {
        serverUrl: this.serverUrl,
        authToken: this.authToken,
        currentUser: this.currentUser,
      }
      console.log('Saving settings to storage:', data)

      await chrome.storage.local.set(data)
      console.log('Settings saved successfully')
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  async checkAuthState() {
    if (!this.authToken) {
      console.log('No auth token found, showing login page')
      this.showLoginPage()
      return
    }

    // 如果沒有 currentUser，嘗試從 JWT token 中解析
    if (!this.currentUser) {
      this.currentUser = this.getUserFromToken()
      if (this.currentUser) {
        this.debugLog('User info extracted from JWT token:', this.currentUser)
        // 保存解析出的用戶信息
        await this.saveSettings()
      }
    }

    // 如果還是沒有用戶信息，顯示登入頁面
    if (!this.currentUser) {
      this.debugLog('Unable to get user info from token, showing login page')
      this.showLoginPage()
      return
    }

    console.log(
      'Checking auth state with token:',
      this.authToken ? 'present' : 'missing'
    )

    // 驗證 token 是否仍然有效
    try {
      const response = await this.apiCall('/jobs', 'GET')
      console.log('Auth check response:', response)

      if (response.success) {
        console.log('Auth valid, showing main page')
        this.showMainPage()
      } else {
        console.log('Auth invalid, logging out')
        this.logout()
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      this.logout()
    }
  }

  initializeUI() {
    // Settings page
    document.getElementById('serverUrl').value = this.serverUrl
    document
      .getElementById('saveSettings')
      .addEventListener('click', () => this.saveServerSettings())
    document
      .getElementById('settingsBackBtn')
      .addEventListener('click', () => this.goBackFromSettings())

    // Login page
    document
      .getElementById('loginBtn')
      .addEventListener('click', () => this.login())
    document
      .getElementById('loginAccount')
      .addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.login()
      })
    document
      .getElementById('loginPassword')
      .addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.login()
      })
    document
      .getElementById('loginSettingsBtn')
      .addEventListener('click', () => this.showSettingsPage())
    document
      .getElementById('showRegisterBtn')
      .addEventListener('click', () => this.showRegisterPage())

    // Register page
    document
      .getElementById('registerBtn')
      .addEventListener('click', () => this.register())
    document
      .getElementById('registerBackBtn')
      .addEventListener('click', () => this.showLoginPage())
    document
      .getElementById('backToLoginLink')
      .addEventListener('click', () => this.showLoginPage())

    // Main page
    document
      .getElementById('extractBtn')
      .addEventListener('click', () => this.extractCookies())
    document
      .getElementById('copyBtn')
      .addEventListener('click', () => this.copyCookies())
    document
      .getElementById('uploadBtn')
      .addEventListener('click', () => this.uploadCookies())
    document
      .getElementById('logoutBtn')
      .addEventListener('click', () => this.logout())
    document
      .getElementById('mainSettingsBtn')
      .addEventListener('click', () => this.showSettingsPage())

    // Update user info if logged in
    if (this.authToken) {
      this.updateUserInfo()
    }
  }

  showPage(pageId) {
    document.querySelectorAll('.page').forEach((page) => {
      page.classList.remove('active')
    })
    document.getElementById(pageId).classList.add('active')
  }

  showLoginPage() {
    this.showPage('loginPage')
  }

  showRegisterPage() {
    this.showPage('registerPage')
  }

  showMainPage() {
    this.showPage('mainPage')
    // 總是嘗試更新用戶信息
    this.updateUserInfo()
  }

  showSettingsPage() {
    this.showPage('settingsPage')
    document.getElementById('serverUrl').value = this.serverUrl
  }

  goBackFromSettings() {
    // 根據登入狀態決定返回哪個頁面
    if (this.authToken && this.currentUser) {
      this.showMainPage()
    } else {
      this.showLoginPage()
    }
  }

  updateUserInfo() {
    // 如果沒有 currentUser，嘗試從 JWT token 中獲取
    if (!this.currentUser && this.authToken) {
      this.currentUser = this.getUserFromToken()
      if (this.currentUser) {
        this.debugLog('User info updated from JWT token:', this.currentUser)
        // 保存更新的用戶信息
        this.saveSettings()
      }
    }

    if (this.currentUser) {
      const userName =
        this.currentUser.displayName ||
        this.currentUser.account ||
        'Unknown User'
      const userAccount = this.currentUser.account || 'unknown'

      document.getElementById('userName').textContent = userName
      document.getElementById('userAccount').textContent = `@${userAccount}`

      this.debugLog('User info displayed:', { userName, userAccount })
    } else {
      // 如果還是沒有用戶信息，顯示默認值
      document.getElementById('userName').textContent = '載入中...'
      document.getElementById('userAccount').textContent = ''
      this.debugLog('No user info available, showing loading state')
    }
  }

  showStatus(elementId, message, type = 'success') {
    const element = document.getElementById(elementId)
    element.textContent = message
    element.className = `status ${type}`
    element.style.display = 'block'

    setTimeout(() => {
      element.style.display = 'none'
    }, 5000)
  }

  async saveServerSettings() {
    const serverUrl = document.getElementById('serverUrl').value.trim()

    if (!serverUrl) {
      this.showStatus('settingsStatus', '請輸入伺服器位址', 'error')
      return
    }

    try {
      // Validate URL format
      new URL(serverUrl)
      this.serverUrl = serverUrl.replace(/\/$/, '') // Remove trailing slash
      await this.saveSettings()
      this.showStatus('settingsStatus', '設定已儲存', 'success')

      setTimeout(() => {
        this.goBackFromSettings()
      }, 1500)
    } catch (error) {
      this.showStatus('settingsStatus', '無效的 URL 格式', 'error')
    }
  }

  async apiCall(endpoint, method = 'GET', data = null) {
    const url = `${this.serverUrl}/api${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    const config = {
      method,
      headers,
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data)
    }

    this.debugLog(`API Call: ${method} ${url}`, {
      data,
      hasAuth: !!this.authToken,
    })

    // 通知 background script API 呼叫
    this.sendToBackground('API_CALL', {
      url,
      method,
      hasAuth: !!this.authToken,
      timestamp: new Date().toISOString(),
    })

    const response = await fetch(url, config)
    const result = await response.json()

    this.debugLog(`API Response: ${method} ${url}`, {
      status: response.status,
      success: result.success,
    })

    return result
  }

  async login() {
    const account = document.getElementById('loginAccount').value.trim()
    const password = document.getElementById('loginPassword').value

    if (!account || !password) {
      this.showStatus('loginStatus', '請填寫所有欄位', 'error')
      return
    }

    const loginBtn = document.getElementById('loginBtn')
    loginBtn.disabled = true
    loginBtn.innerHTML = '<span class="loading"></span>登入中...'

    try {
      const response = await this.apiCall('/login', 'POST', {
        account,
        password,
      })

      if (response.success) {
        this.debugLog('Login successful, saving auth data:', response.result)
        this.authToken = response.result.token
        this.currentUser = response.result.user
        await this.saveSettings()

        // 通知 background script 認證狀態變更
        this.sendToBackground('AUTH_STATE_CHANGED', {
          isLoggedIn: true,
          user: this.currentUser,
          token: this.authToken ? 'present' : 'missing',
        })

        this.showStatus('loginStatus', '登入成功！', 'success')

        setTimeout(() => {
          this.showMainPage()
        }, 1000)
      } else {
        this.debugLog('Login failed:', response)
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
    const account = document.getElementById('registerAccount').value.trim()
    const password = document.getElementById('registerPassword').value
    const displayName = document
      .getElementById('registerDisplayName')
      .value.trim()
    const timezone =
      document.getElementById('registerTimezone').value.trim() || 'Asia/Taipei'

    if (!account || !password || !displayName) {
      this.showStatus('registerStatus', '請填寫所有必填欄位', 'error')
      return
    }

    const registerBtn = document.getElementById('registerBtn')
    registerBtn.disabled = true
    registerBtn.innerHTML = '<span class="loading"></span>註冊中...'

    try {
      const response = await this.apiCall('/register', 'POST', {
        account,
        password,
        displayName,
        timezone,
      })

      if (response.success) {
        console.log(
          'Registration successful, saving auth data:',
          response.result
        )
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

  async extractCookies() {
    try {
      const extractBtn = document.getElementById('extractBtn')
      extractBtn.disabled = true
      extractBtn.innerHTML = '<span class="loading"></span>提取中...'

      // Get all cookies for mayohr.com domain
      const cookies = await chrome.cookies.getAll({
        domain: this.domain,
      })

      // Filter for target cookies
      const targetCookies = cookies.filter((cookie) =>
        this.targetCookies.includes(cookie.name)
      )

      if (targetCookies.length === 0) {
        throw new Error('未找到目標 cookies。請確保已登入 MayoHR 系統。')
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

      const response = await this.apiCall('/cookies', 'PUT', {
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
