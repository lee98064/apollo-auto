<template>
  <div class="settings-page">
    <el-card class="settings-card" shadow="never">
      <div class="settings-card__header">
        <el-button link @click="handleBack" aria-label="返回">
          ← 返回
        </el-button>
        <div>
          <h2>伺服器設定</h2>
          <p class="settings-card__subtitle">調整與後端服務的連線位址</p>
        </div>
      </div>

      <el-alert
        v-if="store.statuses.settings.visible"
        :title="store.statuses.settings.message"
        :type="store.statuses.settings.type"
        show-icon
        class="settings-card__alert"
      />

      <el-form label-position="top" @submit.prevent>
        <el-form-item label="伺服器位址">
          <el-input
            v-model="store.serverUrlInput"
            placeholder="http://localhost:5566"
          />
        </el-form-item>
      </el-form>

      <el-button
        type="primary"
        :loading="store.loading.settings"
        @click="save"
      >
        儲存設定
      </el-button>
    </el-card>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAppState } from '../composables/useAppState'

const router = useRouter()
const appState = useAppState()
const store = appState.state

const save = () => {
  appState.saveSettings()
}

const handleBack = () => {
  if (store.authToken) {
    router.push({ name: 'dashboard' })
  } else {
    router.push({ name: 'login' })
  }
}
</script>

<style scoped>
.settings-page {
  flex: 1;
  padding: 16px;
  box-sizing: border-box;
}

.settings-card {
  border: none;
}

.settings-card__header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.settings-card__header h2 {
  margin: 0;
}

.settings-card__subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: #666;
}

.settings-card__alert {
  margin-bottom: 16px;
}
</style>
