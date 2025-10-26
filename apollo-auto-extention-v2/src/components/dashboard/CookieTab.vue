<template>
  <div class="tab-section">
    <el-alert
      v-if="store.statuses.cookie.visible"
      :title="store.statuses.cookie.message"
      :type="store.statuses.cookie.type"
      show-icon
      class="tab-section__alert"
    />

    <el-space direction="vertical" fill style="width: 100%">
      <el-button
        type="primary"
        :loading="store.loading.cookies"
        @click="extractCookies"
      >
        提取 MayoHR Cookies
      </el-button>

      <el-input
        v-model="store.cookieState.output"
        type="textarea"
        rows="10"
        readonly
        class="cookie-output-area"
      />

      <el-space>
        <el-button
          type="default"
          :disabled="store.cookieState.copyDisabled"
          @click="copyCookies"
        >
          {{ cookieCopyButtonLabel }}
        </el-button>
        <el-button
          type="success"
          :loading="store.loading.cookieUpload"
          :disabled="store.cookieState.uploadDisabled"
          @click="uploadCookies"
        >
          上傳至伺服器
        </el-button>
      </el-space>
    </el-space>
  </div>
</template>

<script setup>
import { useAppState } from '../../composables/useAppState'

const appState = useAppState()
const store = appState.state
const { cookieCopyButtonLabel, extractCookies, copyCookies, uploadCookies } =
  appState
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

.cookie-output-area textarea {
  font-family: 'Menlo', 'Consolas', monospace;
}
</style>
