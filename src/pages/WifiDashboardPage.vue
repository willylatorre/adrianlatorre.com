<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import type { CalcomDashboardStats, CalcomBooking } from '@/types/api-generated'

const { getCalcomDashboard, getCalcomStatus, loading, error } = useApi()

const stats = ref<CalcomDashboardStats | null>(null)
const isConfigured = ref<boolean | null>(null)
const loadError = ref<string | null>(null)

// Format date for display
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Format time for display
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// Format duration
const formatDuration = (startStr: string, endStr: string) => {
  const start = new Date(startStr)
  const end = new Date(endStr)
  const diffMs = end.getTime() - start.getTime()
  const diffMins = Math.round(diffMs / 60000)
  if (diffMins < 60) {
    return `${diffMins} min`
  }
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

// Format currency
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount)
}

// Get attendee name (first attendee)
const getAttendeeName = (booking: CalcomBooking) => {
  const firstAttendee = booking.attendees?.[0]
  if (firstAttendee) {
    return firstAttendee.name || firstAttendee.email
  }
  return 'Unknown'
}

// Get time until lesson
const getTimeUntil = (dateStr: string) => {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (diffDays > 0) {
    return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`
  } else if (diffHours > 0) {
    return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`
  } else {
    const diffMins = Math.floor(diffMs / (1000 * 60))
    if (diffMins > 0) {
      return `in ${diffMins} minute${diffMins > 1 ? 's' : ''}`
    }
    return 'starting now'
  }
}

// Get time since lesson
const getTimeSince = (dateStr: string) => {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  } else {
    const diffMins = Math.floor(diffMs / (1000 * 60))
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  }
}

// Calculate total earned from a booking
const getBookingEarnings = (booking: CalcomBooking) => {
  if (!booking.payment || booking.payment.length === 0) return 0
  return booking.payment.reduce((sum, p) => (p.success ? sum + p.amount : sum), 0)
}

const loadDashboard = async () => {
  loadError.value = null

  // First check if Cal.com is configured
  const statusResult = await getCalcomStatus()
  if (statusResult) {
    isConfigured.value = statusResult.configured
  }

  if (!isConfigured.value) {
    loadError.value = 'Cal.com API is not configured. Please add CAL_API_KEY to your environment.'
    return
  }

  // Load dashboard stats
  const result = await getCalcomDashboard()
  if (result) {
    stats.value = result
  } else if (error.value) {
    loadError.value = error.value
  }
}

onMounted(() => {
  loadDashboard()
})
</script>

<template>
  <UPageHero title="Wifi Dashboard" description="Track your lessons and earnings from Cal.com" />

  <UPageSection>
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 text-primary-500 animate-spin" />
      <span class="ml-3 text-slate-600">Loading dashboard...</span>
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="loadError"
      color="red"
      variant="soft"
      title="Unable to load dashboard"
      :description="loadError"
      icon="i-lucide-alert-circle"
      class="mb-6"
    />

    <!-- Not Configured State -->
    <div v-else-if="isConfigured === false" class="text-center py-12">
      <UIcon name="i-lucide-settings" class="w-16 h-16 text-slate-400 mx-auto mb-4" />
      <h3 class="text-xl font-semibold text-slate-700 mb-2">Cal.com Not Configured</h3>
      <p class="text-slate-500 mb-4">
        To use the Wifi Dashboard, please configure your Cal.com API key.
      </p>
      <div class="bg-slate-100 rounded-lg p-4 max-w-md mx-auto text-left">
        <p class="text-sm text-slate-600 font-mono">
          CAL_API_KEY=your_api_key_here<br />
          CAL_API_BASE_URL=https://api.cal.com/v1
        </p>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div v-else-if="stats">
      <!-- Summary Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <!-- Total Students -->
        <UCard>
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <UIcon name="i-lucide-users" class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p class="text-sm text-slate-500">Total Students</p>
              <p class="text-3xl font-bold text-slate-900">{{ stats.totalStudents }}</p>
            </div>
          </div>
        </UCard>

        <!-- Lessons This Month -->
        <UCard>
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UIcon name="i-lucide-calendar-check" class="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p class="text-sm text-slate-500">Lessons This Month</p>
              <p class="text-3xl font-bold text-slate-900">{{ stats.lessonsThisMonth }}</p>
            </div>
          </div>
        </UCard>

        <!-- Earnings This Month -->
        <UCard>
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <UIcon name="i-lucide-dollar-sign" class="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p class="text-sm text-slate-500">Earned This Month</p>
              <p class="text-3xl font-bold text-slate-900">
                {{ formatCurrency(stats.totalEarnedThisMonth, stats.currency) }}
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Upcoming Lessons Section -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-calendar-clock" class="w-5 h-5 text-primary-500" />
          Upcoming Lessons
        </h2>

        <div
          v-if="stats.upcomingLessons && stats.upcomingLessons.length > 0"
          class="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <UCard
            v-for="lesson in stats.upcomingLessons"
            :key="lesson.id"
            class="hover:shadow-lg transition-shadow"
          >
            <div class="flex flex-col h-full">
              <!-- Header -->
              <div class="flex items-start justify-between mb-4">
                <div>
                  <h3 class="font-semibold text-slate-900 text-lg">{{ lesson.title }}</h3>
                  <p class="text-sm text-primary-600 font-medium">{{ getTimeUntil(lesson.startTime) }}</p>
                </div>
                <UBadge color="blue" variant="soft">Upcoming</UBadge>
              </div>

              <!-- Details -->
              <div class="space-y-3 flex-grow">
                <div class="flex items-center gap-2 text-slate-600">
                  <UIcon name="i-lucide-user" class="w-4 h-4" />
                  <span>{{ getAttendeeName(lesson) }}</span>
                </div>
                <div class="flex items-center gap-2 text-slate-600">
                  <UIcon name="i-lucide-calendar" class="w-4 h-4" />
                  <span>{{ formatDate(lesson.startTime) }}</span>
                </div>
                <div class="flex items-center gap-2 text-slate-600">
                  <UIcon name="i-lucide-clock" class="w-4 h-4" />
                  <span>{{ formatTime(lesson.startTime) }} ({{ formatDuration(lesson.startTime, lesson.endTime) }})</span>
                </div>
                <div
                  v-if="getBookingEarnings(lesson) > 0"
                  class="flex items-center gap-2 text-emerald-600"
                >
                  <UIcon name="i-lucide-dollar-sign" class="w-4 h-4" />
                  <span>{{ formatCurrency(getBookingEarnings(lesson), stats.currency) }}</span>
                </div>
              </div>

              <!-- Attendee Email -->
              <div class="mt-4 pt-4 border-t border-slate-100">
                <p class="text-xs text-slate-400 truncate">
                  {{ lesson.attendees?.[0]?.email || 'No email' }}
                </p>
              </div>
            </div>
          </UCard>
        </div>

        <UCard v-else class="text-center py-8">
          <UIcon name="i-lucide-calendar-x" class="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p class="text-slate-500">No upcoming lessons scheduled</p>
        </UCard>
      </div>

      <!-- Last Lesson Section -->
      <div>
        <h2 class="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-history" class="w-5 h-5 text-slate-500" />
          Last Completed Lesson
        </h2>

        <UCard v-if="stats.lastLesson" class="bg-slate-50">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center">
                <UIcon name="i-lucide-check-circle" class="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <h3 class="font-semibold text-slate-900">{{ stats.lastLesson.title }}</h3>
                <p class="text-sm text-slate-500">{{ getTimeSince(stats.lastLesson.endTime) }}</p>
                <div class="flex items-center gap-4 mt-2 text-sm text-slate-600">
                  <span class="flex items-center gap-1">
                    <UIcon name="i-lucide-user" class="w-4 h-4" />
                    {{ getAttendeeName(stats.lastLesson) }}
                  </span>
                  <span class="flex items-center gap-1">
                    <UIcon name="i-lucide-calendar" class="w-4 h-4" />
                    {{ formatDate(stats.lastLesson.startTime) }}
                  </span>
                  <span class="flex items-center gap-1">
                    <UIcon name="i-lucide-clock" class="w-4 h-4" />
                    {{ formatTime(stats.lastLesson.startTime) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <p v-if="getBookingEarnings(stats.lastLesson) > 0" class="text-lg font-semibold text-emerald-600">
                {{ formatCurrency(getBookingEarnings(stats.lastLesson), stats.currency) }}
              </p>
              <p class="text-xs text-slate-400">
                {{ stats.lastLesson.attendees?.[0]?.email || '' }}
              </p>
            </div>
          </div>
        </UCard>

        <UCard v-else class="text-center py-8 bg-slate-50">
          <UIcon name="i-lucide-calendar-x" class="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p class="text-slate-500">No completed lessons yet</p>
        </UCard>
      </div>
    </div>
  </UPageSection>
</template>
