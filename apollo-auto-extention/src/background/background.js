// background.js - Apollo Auto Extension Background Script

console.log('Apollo Auto Background Script loaded')

// Extension 安裝或更新時觸發
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details)

  if (details.reason === 'install') {
    console.log('First time installation')
    // 可以在這裡設置預設設定
    chrome.storage.local.set({
      serverUrl: 'http://localhost:5566',
      debug: true,
    })
  }
})

// Extension 啟動時觸發
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup')
})

// 監聽來自 popup 的訊息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background:', message, 'from:', sender)

  switch (message.type) {
    case 'DEBUG_LOG':
      console.log('[POPUP DEBUG]', message.data)
      break

    case 'AUTH_STATE_CHANGED':
      console.log('Auth state changed:', message.data)
      handleAuthStateChange(message.data)
      break

    case 'COOKIE_EXTRACTED':
      console.log('Cookies extracted:', message.data)
      break

    case 'API_CALL':
      console.log('API call made:', message.data)
      break

    default:
      console.log('Unknown message type:', message.type)
  }

  // 回應訊息
  sendResponse({ received: true })
})

// 處理認證狀態變更
function handleAuthStateChange(authData) {
  if (authData.isLoggedIn) {
    console.log('User logged in:', authData.user)
    // 可以在這裡設置定時任務等
  } else {
    console.log('User logged out')
    // 清理相關資源
  }
}

// 監聽 storage 變更
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed in namespace:', namespace)

  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`Storage key "${key}" changed:`)
    console.log('  Old value:', oldValue)
    console.log('  New value:', newValue)
  }
})

// 定期檢查功能（如果需要）
function schedulePeriodicCheck() {
  // 每 5 分鐘檢查一次認證狀態
  chrome.alarms.create('authCheck', { periodInMinutes: 5 })
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'authCheck') {
    console.log('Periodic auth check triggered')
    // 可以檢查 token 是否過期等
    checkAuthStatus()
  }
})

// 檢查認證狀態
async function checkAuthStatus() {
  try {
    const data = await chrome.storage.local.get(['authToken', 'currentUser'])
    console.log('Background auth check:', data)

    if (data.authToken) {
      // 可以在這裡驗證 token
      console.log('Auth token exists, user should be logged in')
    } else {
      console.log('No auth token found')
    }
  } catch (error) {
    console.error('Error checking auth status:', error)
  }
}

// 清理函數
function cleanup() {
  console.log('Background script cleanup')
  chrome.alarms.clearAll()
}

// 提供給 popup 使用的工具函數
chrome.runtime.onConnect.addListener((port) => {
  console.log('Port connected:', port.name)

  port.onMessage.addListener((message) => {
    console.log('Port message:', message)
  })

  port.onDisconnect.addListener(() => {
    console.log('Port disconnected')
  })
})

// 錯誤處理
chrome.runtime.onSuspend.addListener(() => {
  console.log('Background script suspended')
  cleanup()
})

// 網絡請求監聽（如果需要調試 API 呼叫）
chrome.webRequest?.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes('localhost:5566') || details.url.includes('api')) {
      console.log('API Request intercepted:', {
        url: details.url,
        method: details.method,
        requestBody: details.requestBody,
      })
    }
  },
  { urls: ['http://localhost:*/*', 'https://*.mayohr.com/*'] },
  ['requestBody']
)

// 導出調試函數供 devtools 使用
globalThis.apolloDebug = {
  getStorageData: async () => {
    return await chrome.storage.local.get()
  },

  clearStorage: async () => {
    await chrome.storage.local.clear()
    console.log('Storage cleared')
  },

  sendMessageToPopup: (message) => {
    chrome.runtime.sendMessage(message)
  },

  logState: async () => {
    const storage = await chrome.storage.local.get()
    console.log('Current extension state:', storage)
  },
}

console.log(
  'Apollo Auto Background Script ready. Debug functions available via apolloDebug.*'
)
