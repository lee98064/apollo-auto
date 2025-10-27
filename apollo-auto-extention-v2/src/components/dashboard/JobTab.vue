<template>
  <div class="tab-section">
    <el-alert v-if="store.statuses.job.visible" :title="store.statuses.job.message" :type="store.statuses.job.type"
      show-icon class="tab-section__alert" />

    <div class="job-list" v-if="store.jobs.length > 0">
      <el-card v-for="job in store.jobs" :key="job.id" class="job-card" shadow="hover">
        <div class="job-card__header">
          <div>
            <h4>{{ jobTypeLabel(job.type) }}</h4>
            <p class="job-card__id">ID: {{ job.id }}</p>
          </div>
          <el-tag :type="job.isActive ? 'success' : 'info'">
            {{ job.isActive ? '啟用' : '停用' }}
          </el-tag>
        </div>

        <el-descriptions :column="2" size="small" border>
          <el-descriptions-item label="開始時間">
            {{ formatJobTime(job.startAt, '未設定') }}
          </el-descriptions-item>
          <el-descriptions-item label="結束時間">
            {{ formatJobTime(job.endAt, '未設定') }}
          </el-descriptions-item>
          <el-descriptions-item label="過期時間">
            {{ job.expiredAt ? formatDateTime(job.expiredAt) : '未設定' }}
          </el-descriptions-item>
          <el-descriptions-item label="狀態">
            {{ job.status || '未知' }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="job-card__actions">
          <el-button :type="job.isActive ? 'warning' : 'success'" size="small" @click="toggleJobStatus(job)">
            {{ job.isActive ? '停用' : '啟用' }}
          </el-button>
          <el-button size="small" @click="editJob(job)">編輯</el-button>
          <el-button
            type="danger"
            size="small"
            :loading="job.__deleting"
            @click="deleteJob(job)"
          >
            刪除
          </el-button>
        </div>
      </el-card>
    </div>

    <el-empty v-else :description="store.jobEmptyMessage" class="job-empty" />

    <div v-if="store.isJobFormVisible" class="job-form">
      <el-card shadow="never">
        <div class="job-form__header">
          <h3>
            {{ store.editingJobId !== null ? '更新排程' : '新增排程' }}
          </h3>
          <el-button link @click="hideAddJobForm">取消</el-button>
        </div>

        <el-form label-position="top" @submit.prevent>
          <el-form-item label="排程類型">
            <el-select v-model="store.jobForm.type">
              <el-option label="上班打卡" value="CHECK_IN" />
              <el-option label="下班打卡" value="CHECK_OUT" />
            </el-select>
          </el-form-item>

          <el-form-item label="排程亂數起始時間">
            <el-time-picker v-model="store.jobForm.startTime" format="HH:mm" value-format="HH:mm" placeholder="選擇時間" />
          </el-form-item>

          <el-form-item label="排程亂數結束時間">
            <el-time-picker v-model="store.jobForm.endTime" format="HH:mm" value-format="HH:mm" placeholder="選擇時間"
              clearable />
          </el-form-item>

          <el-form-item label="排程過期時間（可選）">
            <el-date-picker v-model="store.jobForm.expireTime" type="datetime" format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DDTHH:mm" placeholder="選擇日期時間" clearable />
          </el-form-item>

          <el-form-item label="執行設定">
            <div class="job-switch-group">
              <label class="job-switch-row">
                <el-switch v-model="store.jobForm.skipHoliday" />
                <span>跳過假日</span>
              </label>
              <label class="job-switch-row">
                <el-switch v-model="store.jobForm.skipLeaves" />
                <span>跳過請假日</span>
              </label>
            </div>
          </el-form-item>

          <el-form-item label="立即啟用">
            <el-switch v-model="store.jobForm.isActive" />
          </el-form-item>
        </el-form>

        <el-button type="primary" :loading="store.loading.jobForm" @click="submitJobForm">
          {{ jobFormSubmitLabel }}
        </el-button>
      </el-card>
    </div>

    <el-button v-else type="primary" class="job-add-btn" @click="showAddJobForm">
      新增排程
    </el-button>
  </div>
</template>

<script setup>
import { useAppState } from '../../composables/useAppState'

const appState = useAppState()
const store = appState.state
const {
  jobTypeLabel,
  formatJobTime,
  formatDateTime,
  toggleJobStatus,
  editJob,
  deleteJob,
  hideAddJobForm,
  submitJobForm,
  jobFormSubmitLabel,
  showAddJobForm,
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

.job-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.job-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.job-card__header h4 {
  margin: 0;
}

.job-card__id {
  margin: 4px 0 0;
  font-size: 12px;
  color: #666;
}

.job-card__actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.job-form {
  margin-top: 12px;
}

.job-form__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.job-add-btn {
  align-self: flex-start;
}

.job-switch-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.job-switch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #4a4a4a;
}
</style>
