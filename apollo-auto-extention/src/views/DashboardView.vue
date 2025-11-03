<template>
  <div class="dashboard-page">
    <el-container class="dashboard-container">
      <el-header class="dashboard-header">
        <div class="dashboard-header__info">
          <h2>Apollo Auto</h2>
          <span class="dashboard-header__greeting">{{ greeting }}</span>
        </div>
        <div class="dashboard-header__actions">
          <el-button
            circle
            link
            @click="goSettings"
            aria-label="開啟設定"
            title="設定"
          >
            ⚙️
          </el-button>
          <el-button type="danger" size="small" @click="logout">
            登出
          </el-button>
        </div>
      </el-header>
      <el-main class="dashboard-main">
        <el-tabs v-model="activeTabModel" @tab-change="handleTabChange">
          <el-tab-pane label="狀態監控" name="status">
            <StatusTab />
          </el-tab-pane>
          <el-tab-pane label="Cookie 管理" name="cookie">
            <CookieTab />
          </el-tab-pane>
          <el-tab-pane label="排程管理" name="job">
            <JobTab />
          </el-tab-pane>
          <el-tab-pane label="Telegram 通知" name="telegram">
            <TelegramTab />
          </el-tab-pane>
        </el-tabs>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppState } from '../composables/useAppState'
import StatusTab from '../components/dashboard/StatusTab.vue'
import CookieTab from '../components/dashboard/CookieTab.vue'
import JobTab from '../components/dashboard/JobTab.vue'
import TelegramTab from '../components/dashboard/TelegramTab.vue'

const router = useRouter()
const appState = useAppState()
const store = appState.state
const greeting = appState.greeting
const logout = appState.logout

const activeTabModel = computed({
  get: () => store.activeTab,
  set: (value) => appState.setActiveTab(value),
})

const goSettings = () => {
  router.push({ name: 'settings' })
}

const handleTabChange = (tabPane) => {
  const name = typeof tabPane === 'string' ? tabPane : tabPane.props?.name
  if (name) {
    triggerLoad(name)
  }
}

const triggerLoad = (tab) => {
  switch (tab) {
    case 'status':
      appState.loadJobStatus()
      break
    case 'job':
      appState.loadJobs()
      break
    case 'telegram':
      appState.loadTelegramTokens()
      break
    default:
      break
  }
}

onMounted(() => {
  triggerLoad(activeTabModel.value)
})

watch(
  () => activeTabModel.value,
  (value, previous) => {
    if (value !== previous) {
      triggerLoad(value)
    }
  }
)
</script>

<style scoped>
.dashboard-page {
  flex: 1;
  background: #f5f6fa;
}

.dashboard-container {
  height: 100%;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e0e5f3;
}

.dashboard-header__info h2 {
  margin: 0;
  font-size: 18px;
}

.dashboard-header__greeting {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: #606266;
}

.dashboard-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dashboard-main {
  padding: 0 12px 12px;
  box-sizing: border-box;
}
</style>
