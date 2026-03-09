<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  speedHistory: Array,
  accelXHistory: Array,
  accelYHistory: Array,
  accelZHistory: Array,
  gyroPitchHistory: Array,
  gyroRollHistory: Array,
  gyroYawHistory: Array,
  timeLabels: Array
})

const speedChartRef = ref(null)
const accelerationChartRef = ref(null)
const gyroscopeChartRef = ref(null)

let speedChart = null
let accelerationChart = null
let gyroscopeChart = null

function initSpeedChart() {
  if (!speedChartRef.value) return
  if (speedChart) speedChart.dispose()
  speedChart = echarts.init(speedChartRef.value)
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0,0,0,0.8)',
      borderColor: '#333',
      textStyle: { color: '#fff' },
      axisPointer: {
        type: 'cross',
        crossStyle: { color: '#3b82f6' }
      }
    },
    grid: { left: '12%', right: '5%', top: '15%', bottom: '15%' },
    xAxis: {
      type: 'category',
      data: props.timeLabels,
      axisLine: { lineStyle: { color: '#333' } },
      axisLabel: { color: '#666', fontSize: 10 },
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 120,
      axisLine: { lineStyle: { color: '#333' } },
      axisLabel: { color: '#666' },
      splitLine: { lineStyle: { color: '#222', type: 'dashed' } }
    },
    series: [
      {
        type: 'line',
        data: props.speedHistory,
        smooth: 0.4,
        symbol: 'circle',
        symbolSize: 8,
        showSymbol: true,
        lineStyle: { color: '#3b82f6', width: 3 },
        itemStyle: { 
          color: '#3b82f6',
          borderColor: '#fff',
          borderWidth: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.5)' },
            { offset: 0.5, color: 'rgba(59, 130, 246, 0.2)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0)' }
          ])
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            color: '#60a5fa',
            borderColor: '#fff',
            borderWidth: 3,
            shadowBlur: 10,
            shadowColor: 'rgba(59, 130, 246, 0.5)'
          }
        }
      }
    ]
  }
  speedChart.setOption(option)
}

function initAccelerationChart() {
  if (!accelerationChartRef.value) return
  if (accelerationChart) accelerationChart.dispose()
  accelerationChart = echarts.init(accelerationChartRef.value)
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0,0,0,0.8)',
      borderColor: '#333',
      textStyle: { color: '#fff' },
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['X', 'Y', 'Z'],
      textStyle: { color: '#888' },
      top: 0,
      right: 10,
      itemWidth: 12,
      itemHeight: 12
    },
    grid: { left: '12%', right: '5%', top: '20%', bottom: '15%' },
    xAxis: {
      type: 'category',
      data: props.timeLabels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#333' } },
      axisLabel: { color: '#666', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      min: -2,
      max: 2,
      axisLine: { lineStyle: { color: '#333' } },
      axisLabel: { color: '#666' },
      splitLine: { lineStyle: { color: '#222', type: 'dashed' } }
    },
    series: [
      {
        name: 'X',
        type: 'line',
        data: props.accelXHistory,
        smooth: 0.4,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: true,
        lineStyle: { color: '#22c55e', width: 2 },
        itemStyle: { color: '#22c55e', borderColor: '#fff', borderWidth: 1 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(34, 197, 94, 0.4)' },
            { offset: 1, color: 'rgba(34, 197, 94, 0)' }
          ])
        }
      },
      {
        name: 'Y',
        type: 'line',
        data: props.accelYHistory,
        smooth: 0.4,
        symbol: 'diamond',
        symbolSize: 6,
        showSymbol: true,
        lineStyle: { color: '#f59e0b', width: 2 },
        itemStyle: { color: '#f59e0b', borderColor: '#fff', borderWidth: 1 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245, 158, 11, 0.4)' },
            { offset: 1, color: 'rgba(245, 158, 11, 0)' }
          ])
        }
      },
      {
        name: 'Z',
        type: 'line',
        data: props.accelZHistory,
        smooth: 0.4,
        symbol: 'triangle',
        symbolSize: 6,
        showSymbol: true,
        lineStyle: { color: '#ef4444', width: 2 },
        itemStyle: { color: '#ef4444', borderColor: '#fff', borderWidth: 1 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(239, 68, 68, 0.4)' },
            { offset: 1, color: 'rgba(239, 68, 68, 0)' }
          ])
        }
      }
    ]
  }
  accelerationChart.setOption(option)
}

function initGyroscopeChart() {
  if (!gyroscopeChartRef.value) return
  if (gyroscopeChart) gyroscopeChart.dispose()
  gyroscopeChart = echarts.init(gyroscopeChartRef.value)
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0,0,0,0.8)',
      borderColor: '#333',
      textStyle: { color: '#fff' },
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['Pitch', 'Roll', 'Yaw'],
      textStyle: { color: '#888' },
      top: 0,
      right: 10,
      itemWidth: 12,
      itemHeight: 12
    },
    grid: { left: '12%', right: '5%', top: '20%', bottom: '15%' },
    xAxis: {
      type: 'category',
      data: props.timeLabels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#333' } },
      axisLabel: { color: '#666', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      min: -10,
      max: 10,
      axisLine: { lineStyle: { color: '#333' } },
      axisLabel: { color: '#666' },
      splitLine: { lineStyle: { color: '#222', type: 'dashed' } }
    },
    series: [
      {
        name: 'Pitch',
        type: 'line',
        data: props.gyroPitchHistory,
        smooth: 0.4,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: true,
        lineStyle: { color: '#8b5cf6', width: 2 },
        itemStyle: { color: '#8b5cf6', borderColor: '#fff', borderWidth: 1 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(139, 92, 246, 0.4)' },
            { offset: 1, color: 'rgba(139, 92, 246, 0)' }
          ])
        }
      },
      {
        name: 'Roll',
        type: 'line',
        data: props.gyroRollHistory,
        smooth: 0.4,
        symbol: 'diamond',
        symbolSize: 6,
        showSymbol: true,
        lineStyle: { color: '#ec4899', width: 2 },
        itemStyle: { color: '#ec4899', borderColor: '#fff', borderWidth: 1 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(236, 72, 153, 0.4)' },
            { offset: 1, color: 'rgba(236, 72, 153, 0)' }
          ])
        }
      },
      {
        name: 'Yaw',
        type: 'line',
        data: props.gyroYawHistory,
        smooth: 0.4,
        symbol: 'triangle',
        symbolSize: 6,
        showSymbol: true,
        lineStyle: { color: '#06b6d4', width: 2 },
        itemStyle: { color: '#06b6d4', borderColor: '#fff', borderWidth: 1 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(6, 182, 212, 0.4)' },
            { offset: 1, color: 'rgba(6, 182, 212, 0)' }
          ])
        }
      }
    ]
  }
  gyroscopeChart.setOption(option)
}

function updateCharts() {
  if (speedChart) {
    speedChart.setOption({ 
      xAxis: { data: props.timeLabels }, 
      series: [{ data: props.speedHistory }] 
    })
  }
  if (accelerationChart) {
    accelerationChart.setOption({
      xAxis: { data: props.timeLabels },
      series: [
        { data: props.accelXHistory },
        { data: props.accelYHistory },
        { data: props.accelZHistory }
      ]
    })
  }
  if (gyroscopeChart) {
    gyroscopeChart.setOption({
      xAxis: { data: props.timeLabels },
      series: [
        { data: props.gyroPitchHistory },
        { data: props.gyroRollHistory },
        { data: props.gyroYawHistory }
      ]
    })
  }
}

defineExpose({ initCharts: () => {
  initSpeedChart()
  initAccelerationChart()
  initGyroscopeChart()
}, updateCharts })

function handleResize() {
  speedChart?.resize()
  accelerationChart?.resize()
  gyroscopeChart?.resize()
}

onMounted(() => {
  initSpeedChart()
  initAccelerationChart()
  initGyroscopeChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  speedChart?.dispose()
  accelerationChart?.dispose()
  gyroscopeChart?.dispose()
})
</script>

<template>
  <div class="charts-grid">
    <div class="chart-card">
      <h3>Speed Over Time</h3>
      <div ref="speedChartRef" class="chart"></div>
    </div>
    
    <div class="chart-card">
      <h3>Acceleration (X, Y, Z)</h3>
      <div ref="accelerationChartRef" class="chart"></div>
    </div>
    
    <div class="chart-card">
      <h3>Gyroscope (Pitch, Roll, Yaw)</h3>
      <div ref="gyroscopeChartRef" class="chart"></div>
    </div>
  </div>
</template>

<style scoped>
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
  overflow: hidden;
}

.chart-card {
  background: #161616;
  border: 1px solid #222;
  border-radius: 12px;
  padding: 20px;
  overflow: hidden;
  min-width: 0;
}

.chart-card h3 {
  font-size: 14px;
  font-weight: 600;
  color: #888;
  margin-bottom: 15px;
}

.chart {
  height: 220px;
  width: 100%;
}

@media (max-width: 1400px) {
  .charts-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 900px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .charts-grid {
    touch-action: pan-y;
  }
  
  .chart-card {
    padding: 15px;
  }
  
  .chart-card h3 {
    font-size: 12px;
    margin-bottom: 10px;
  }
  
  .chart {
    height: 180px;
  }
}
</style>
