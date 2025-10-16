// popup.js - Cookie extraction logic

class CookieExtractor {
  constructor() {
    this.targetCookies = ['__ModuleSessionCookie', '__ModuleSessionCookie2']
    this.domain = '.mayohr.com'

    this.initializeUI()
  }

  initializeUI() {
    this.extractBtn = document.getElementById('extractBtn')
    this.copyBtn = document.getElementById('copyBtn')
    this.cookieOutput = document.getElementById('cookieOutput')
    this.status = document.getElementById('status')

    this.extractBtn.addEventListener('click', () => this.extractCookies())
    this.copyBtn.addEventListener('click', () => this.copyCookies())
  }

  showStatus(message, type = 'success') {
    this.status.textContent = message
    this.status.className = `status ${type}`
    this.status.style.display = 'block'

    setTimeout(() => {
      this.status.style.display = 'none'
    }, 3000)
  }

  async extractCookies() {
    try {
      this.extractBtn.disabled = true
      this.extractBtn.textContent = '提取中...'

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

      this.cookieOutput.textContent = jsonOutput
      this.cookieOutput.className = 'cookie-output'

      this.copyBtn.disabled = false
      this.showStatus(`成功提取 ${targetCookies.length} 個 cookies`, 'success')

      // Store the JSON string for copying
      this.cookieJsonString = JSON.stringify(formattedCookies)
    } catch (error) {
      console.error('Cookie extraction failed:', error)
      this.showStatus(error.message, 'error')
      this.cookieOutput.textContent = '提取失敗：' + error.message
      this.cookieOutput.className = 'cookie-output empty'
      this.copyBtn.disabled = true
    } finally {
      this.extractBtn.disabled = false
      this.extractBtn.textContent = '提取 MayoHR Cookies'
    }
  }

  async copyCookies() {
    try {
      if (!this.cookieJsonString) {
        throw new Error('沒有可複製的 cookie 數據')
      }

      // Escape the JSON string for API usage
      const escapedJsonString = this.cookieJsonString
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')

      await navigator.clipboard.writeText(escapedJsonString)
      this.showStatus('已複製到剪貼板（含跳脫字元）！', 'success')

      // Temporarily change button text
      const originalText = this.copyBtn.textContent
      this.copyBtn.textContent = '已複製！'
      setTimeout(() => {
        this.copyBtn.textContent = originalText
      }, 2000)
    } catch (error) {
      console.error('Copy failed:', error)
      this.showStatus('複製失敗：' + error.message, 'error')
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new CookieExtractor()
})
