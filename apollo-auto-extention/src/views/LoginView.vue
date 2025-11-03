<template>
  <div class="auth-page">
    <el-card class="auth-card" shadow="never">
      <div class="auth-card__header">
        <div class="auth-card__title">
          <h2>Apollo Auto</h2>
          <p class="auth-card__subtitle">請登入您的帳號</p>
        </div>
        <el-tooltip content="設定伺服器位址">
          <el-button
            circle
            type="primary"
            link
            @click="goSettings"
            aria-label="開啟設定"
          >
            ⚙️
          </el-button>
        </el-tooltip>
      </div>

      <el-alert
        v-if="state.statuses.login.visible"
        :title="state.statuses.login.message"
        :type="state.statuses.login.type"
        show-icon
        class="auth-card__alert"
      />

      <el-form label-position="top" @submit.prevent>
        <el-form-item label="帳號">
          <el-input
            v-model="state.loginForm.account"
            autocomplete="username"
            placeholder="請輸入帳號"
          />
        </el-form-item>
        <el-form-item label="密碼">
          <el-input
            v-model="state.loginForm.password"
            type="password"
            autocomplete="current-password"
            show-password
            placeholder="請輸入密碼"
          />
        </el-form-item>
      </el-form>

      <el-button
        type="primary"
        class="auth-card__action"
        :loading="state.loading.login"
        @click="handleLogin"
      >
        登入
      </el-button>

      <div class="auth-card__footer">
        <span>還沒有帳號嗎？</span>
        <el-link type="primary" @click="goRegister">立即註冊</el-link>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAppState } from '../composables/useAppState'

const router = useRouter()
const { state, login } = useAppState()

const handleLogin = () => {
  login()
}

const goRegister = () => {
  router.push({ name: 'register' })
}

const goSettings = () => {
  router.push({ name: 'settings' })
}
</script>

<style scoped>
.auth-page {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #eef2ff 0%, #f5f6fa 100%);
}

.auth-card {
  width: 100%;
  max-width: 360px;
  border: none;
}

.auth-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.auth-card__title h2 {
  margin: 0;
  font-size: 20px;
}

.auth-card__subtitle {
  margin: 4px 0 0;
  color: #666;
  font-size: 13px;
}

.auth-card__alert {
  margin-bottom: 16px;
}

.auth-card__action {
  width: 100%;
  margin-top: 8px;
}

.auth-card__footer {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
}
</style>
