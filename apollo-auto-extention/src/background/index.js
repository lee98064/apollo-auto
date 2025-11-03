// Apollo Auto Extension Background Service Worker (V2)

console.log('Apollo Auto Background (Vue version) loaded')

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details)

  if (details.reason === 'install') {
    chrome.storage.local.set({
      serverUrl: 'http://localhost:5566',
      debug: true,
    })
  }
})

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup')
})

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

  sendResponse({ received: true })
})

function handleAuthStateChange(authData) {
  if (authData.isLoggedIn) {
    console.log('User logged in:', authData.user)
  } else {
    console.log('User logged out')
  }
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed in namespace:', namespace)

  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`Storage key "${key}" changed:`)
    console.log('  Old value:', oldValue)
    console.log('  New value:', newValue)
  }
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'authCheck') {
    console.log('Periodic auth check triggered')
    checkAuthStatus()
  }
})

async function checkAuthStatus() {
  try {
    const data = await chrome.storage.local.get(['authToken', 'currentUser'])
    console.log('Background auth check:', data)
  } catch (error) {
    console.error('Error checking auth status:', error)
  }
}

chrome.runtime.onConnect.addListener((port) => {
  console.log('Port connected:', port.name)

  port.onMessage.addListener((message) => {
    console.log('Port message:', message)
  })

  port.onDisconnect.addListener(() => {
    console.log('Port disconnected')
  })
})

chrome.runtime.onSuspend.addListener(() => {
  console.log('Background script suspended')
  chrome.alarms.clearAll()
})

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
}
