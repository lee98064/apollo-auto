<template>
  <div class="auth-page">
    <el-card class="auth-card" shadow="never">
      <div class="auth-card__header">
        <el-button link @click="goLogin" aria-label="返回登入">
          ← 返回
        </el-button>
        <div class="auth-card__title">
          <h2>建立帳號</h2>
          <p class="auth-card__subtitle">輸入基本資訊完成註冊</p>
        </div>
      </div>

      <el-alert
        v-if="state.statuses.register.visible"
        :title="state.statuses.register.message"
        :type="state.statuses.register.type"
        show-icon
        class="auth-card__alert"
      />

      <el-form label-position="top" @submit.prevent>
        <el-form-item label="帳號">
          <el-input
            v-model="state.registerForm.account"
            autocomplete="username"
            placeholder="請輸入帳號"
          />
        </el-form-item>
        <el-form-item label="密碼">
          <el-input
            v-model="state.registerForm.password"
            type="password"
            autocomplete="new-password"
            show-password
            placeholder="請輸入密碼"
          />
        </el-form-item>
        <el-form-item label="顯示名稱">
          <el-input
            v-model="state.registerForm.displayName"
            placeholder="請輸入顯示名稱"
          />
        </el-form-item>
        <el-form-item label="時區">
          <el-input
            v-model="state.registerForm.timezone"
            placeholder="Asia/Taipei"
          />
        </el-form-item>
      </el-form>

      <el-button
        type="primary"
        class="auth-card__action"
        :loading="state.loading.register"
        @click="handleRegister"
      >
        註冊
      </el-button>
    </el-card>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAppState } from '../composables/useAppState'

const router = useRouter()
const { state, register } = useAppState()

const handleRegister = () => {
  register()
}

const goLogin = () => {
  router.push({ name: 'login' })
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
  align-items: center;
  gap: 12px;
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
</style>
