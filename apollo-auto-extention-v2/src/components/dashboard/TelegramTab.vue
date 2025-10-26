<template>
  <div class="tab-section">
    <el-alert
      v-if="store.statuses.telegram.visible"
      :title="store.statuses.telegram.message"
      :type="store.statuses.telegram.type"
      show-icon
      class="tab-section__alert"
    />

    <div v-if="store.isTelegramFormVisible" class="telegram-form">
      <el-card shadow="never">
        <div class="telegram-form__header">
          <h3>{{ telegramFormTitle }}</h3>
          <el-button link @click="hideTelegramTokenForm">取消</el-button>
        </div>

        <el-form label-position="top" @submit.prevent>
          <el-form-item label="Token 名稱（可選）">
            <el-input
              v-model="store.telegramForm.name"
              placeholder="例如：個人通知"
            />
          </el-form-item>
          <el-form-item label="Bot Token">
            <el-input
              v-model="store.telegramForm.botToken"
              placeholder="輸入 Telegram Bot Token"
            />
          </el-form-item>
          <el-form-item label="Chat ID">
            <el-input
              v-model="store.telegramForm.chatId"
              placeholder="輸入接收通知的 Chat ID"
            />
          </el-form-item>
          <el-form-item label="啟用通知">
            <el-switch v-model="store.telegramForm.isActive" />
          </el-form-item>
        </el-form>

        <el-button
          type="primary"
          :loading="store.loading.telegramSave"
          @click="saveTelegramToken"
        >
          {{ telegramSaveButtonLabel }}
        </el-button>
      </el-card>
    </div>
    <el-button
      v-else
      type="primary"
      class="telegram-add-btn"
      @click="showTelegramTokenForm()"
    >
      新增 Telegram Token
    </el-button>

    <div class="telegram-list">
      <template v-if="store.telegramTokens.length === 0">
        <el-empty :description="store.telegramEmptyMessage" />
      </template>
      <template v-else>
        <el-card
          v-for="token in store.telegramTokens"
          :key="token.id"
          class="telegram-card"
          shadow="hover"
        >
          <div class="telegram-card__header">
            <div>
              <h4>{{ token.name || '未命名 Token' }}</h4>
              <p class="telegram-card__meta">
                Chat ID：{{ token.chatId || '-' }}
              </p>
            </div>
            <el-tag :type="token.isActive ? 'success' : 'info'">
              {{ token.isActive ? '啟用' : '停用' }}
            </el-tag>
          </div>
          <div class="telegram-card__body">
            <div>
              <span class="telegram-card__label">Bot Token</span>
              <span class="telegram-card__value">{{
                maskSensitiveValue(token.botToken)
              }}</span>
            </div>
          </div>
          <div class="telegram-card__actions">
            <el-button
              size="small"
              :loading="token.__testing"
              @click="sendTelegramTest(token)"
            >
              發送測試
            </el-button>
            <el-button size="small" @click="showTelegramTokenForm(token)">
              編輯
            </el-button>
            <el-button
              type="danger"
              size="small"
              :loading="token.__deleting"
              @click="deleteTelegramToken(token)"
            >
              刪除
            </el-button>
          </div>
        </el-card>
      </template>
    </div>
  </div>
</template>

<script setup>
import { useAppState } from '../../composables/useAppState'

const appState = useAppState()
const store = appState.state
const {
  telegramFormTitle,
  hideTelegramTokenForm,
  saveTelegramToken,
  telegramSaveButtonLabel,
  showTelegramTokenForm,
  maskSensitiveValue,
  sendTelegramTest,
  deleteTelegramToken,
} = appState
</script>

<style scoped>
.tab-section {
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tab-section__alert {
  margin-bottom: 8px;
}

.telegram-form {
  margin-bottom: 12px;
}

.telegram-form__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.telegram-add-btn {
  align-self: flex-start;
}

.telegram-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.telegram-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.telegram-card__header h4 {
  margin: 0;
}

.telegram-card__meta {
  margin: 4px 0 0;
  font-size: 12px;
  color: #666;
}

.telegram-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
  font-size: 13px;
}

.telegram-card__label {
  color: #888;
  margin-right: 4px;
}

.telegram-card__actions {
  display: flex;
  gap: 8px;
}
</style>
