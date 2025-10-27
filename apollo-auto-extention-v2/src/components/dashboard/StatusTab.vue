<template>
  <div class="tab-section">
    <el-alert v-if="store.statuses.statusTab.visible" :title="store.statuses.statusTab.message"
      :type="store.statuses.statusTab.type" show-icon class="tab-section__alert" />

    <el-row :gutter="12" class="status-overview-row">
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="status-metric">
            <span class="status-metric__label">總排程數量</span>
            <span class="status-metric__value">{{
              store.statusOverview.totalJobs
            }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div class="status-metric">
            <span class="status-metric__label">啟用排程</span>
            <span class="status-metric__value">{{
              store.statusOverview.activeJobs
            }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="24">
        <el-card shadow="hover">
          <div class="status-metric">
            <span class="status-metric__label">上次執行</span>
            <span class="status-metric__value">{{
              store.statusOverview.lastExecution
            }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <div class="status-list">
      <template v-if="store.statusJobs.length === 0">
        <el-empty :description="store.statusEmptyMessage" />
      </template>
      <template v-else>
        <el-card v-for="job in store.statusJobs" :key="job.id" class="status-card"
          :class="job.isActive ? 'is-active' : 'is-inactive'" shadow="hover">
          <div class="status-card__header">
            <div>
              <h4>{{ jobTypeLabel(job.type) }} (ID: {{ job.id }})</h4>
              <span class="status-card__badge" :class="job.isActive ? 'active' : 'inactive'">
                {{ job.isActive ? '啟用' : '停用' }}
              </span>
            </div>
            <span class="status-card__next">
              下次執行：{{ formatDateTime(job.nextExecutionAt) }}
            </span>
          </div>
          <ul class="status-card__details">
            <li>開始時間：{{ formatJobTime(job.startAt, '-') }}</li>
            <li>上次執行：{{ formatExecutionInfo(job) }}</li>
            <li v-if="job.expiredAt">
              過期時間：{{ formatDateTime(job.expiredAt) }}
            </li>
            <li>狀態：{{ jobStatusLabel(job) }}</li>
          </ul>
        </el-card>
      </template>
    </div>
  </div>
</template>

<script setup>
import { useAppState } from '../../composables/useAppState'

const appState = useAppState()
const store = appState.state
const { jobTypeLabel, formatJobTime, formatDateTime, formatExecutionInfo, jobStatusLabel } =
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

.status-overview-row {
  margin: 0;
}

.status-overview-row .el-col {
  margin-bottom: 12px;
}

.status-metric {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-metric__label {
  font-size: 13px;
  color: #666;
}

.status-metric__value {
  font-size: 20px;
  font-weight: 600;
  color: #1a73e8;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-card {
  border-left: 4px solid transparent;
}

.status-card.is-active {
  border-left-color: #34a853;
}

.status-card.is-inactive {
  border-left-color: #a0a5b1;
}

.status-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.status-card__header h4 {
  margin: 0 0 4px;
}

.status-card__badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: #fff;
}

.status-card__badge.active {
  background: #34a853;
}

.status-card__badge.inactive {
  background: #a0a5b1;
}

.status-card__next {
  font-size: 12px;
  color: #606266;
}

.status-card__details {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 13px;
  color: #555;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
