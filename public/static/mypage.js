// ファディー彦根 - マイページ

// ========== グローバル変数 ==========
let currentUser = null;
let authToken = null;
let healthLogs = [];
let staffAdvices = [];

// ========== ユーティリティ関数 ==========
function showLoading() {
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.className = 'loading-overlay';
  overlay.innerHTML = '<div class="spinner spinner-lg"></div>';
  document.body.appendChild(overlay);
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.remove();
}

async function apiRequest(url, options = {}) {
  showLoading();
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await axios({ url, method: options.method || 'GET', headers, data: options.body, ...options });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  } finally {
    hideLoading();
  }
}

// ========== データ読み込み ==========
async function loadUserData() {
  try {
    const result = await apiRequest('/api/auth/me');
    if (result.success) {
      currentUser = result.data;
      renderPage();
      await Promise.all([loadHealthLogs(), loadStaffAdvices()]);
    } else {
      window.location.href = '/';
    }
  } catch (error) {
    alert('ユーザー情報の取得に失敗しました');
    window.location.href = '/';
  }
}

async function loadHealthLogs() {
  try {
    const result = await apiRequest('/api/health-logs?limit=30');
    if (result.success) {
      healthLogs = result.data;
      renderHealthLogs();
      renderChart();
    }
  } catch (error) {
    console.error('Failed to load health logs:', error);
  }
}

async function loadStaffAdvices() {
  try {
    const result = await apiRequest('/api/advices?limit=10');
    if (result.success) {
      staffAdvices = result.data;
      renderStaffAdvices();
    }
  } catch (error) {
    console.error('Failed to load advices:', error);
  }
}

// ========== レンダリング関数 ==========
function renderPage() {
  const root = document.getElementById('root');
  root.innerHTML = `
    <header class="bg-white shadow-md">
      <div class="container mx-auto px-4 py-4">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <a href="/" class="flex items-center gap-3">
              <i class="fas fa-dumbbell text-3xl text-primary"></i>
              <h1 class="text-2xl font-bold text-gray-800">ファディー彦根</h1>
            </a>
          </div>
          <nav class="flex items-center gap-4">
            ${currentUser && currentUser.role === 'admin' ? `
              <a href="/admin" class="btn btn-secondary">
                <i class="fas fa-cog"></i> 管理画面
              </a>
            ` : ''}
            <a href="/" class="btn btn-outline">
              <i class="fas fa-home"></i> ホーム
            </a>
          </nav>
        </div>
      </div>
    </header>

    <main class="container mx-auto px-4 py-8">
      <div class="flex items-center gap-4 mb-8">
        <div class="w-20 h-20 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center text-white text-3xl font-bold">
          ${currentUser.name.charAt(0)}
        </div>
        <div>
          <h2 class="text-3xl font-bold text-gray-800">${currentUser.name} さん</h2>
          <p class="text-gray-600">${currentUser.email}</p>
        </div>
      </div>

      <!-- スタッフアドバイス -->
      <section class="mb-8">
        <h3 class="text-2xl font-bold text-gray-800 mb-4">
          <i class="fas fa-comments text-primary mr-2"></i> 最新のアドバイス
        </h3>
        <div id="staff-advices-container"></div>
      </section>

      <!-- 体重・体脂肪率グラフ -->
      <section class="mb-8">
        <h3 class="text-2xl font-bold text-gray-800 mb-4">
          <i class="fas fa-chart-line text-primary mr-2"></i> 推移グラフ
        </h3>
        <div class="card">
          <canvas id="healthChart" height="100"></canvas>
        </div>
      </section>

      <!-- 健康ログ一覧 -->
      <section>
        <h3 class="text-2xl font-bold text-gray-800 mb-4">
          <i class="fas fa-list text-primary mr-2"></i> 健康ログ履歴
        </h3>
        <div id="health-logs-container"></div>
      </section>
    </main>
  `;
}

function renderStaffAdvices() {
  const container = document.getElementById('staff-advices-container');
  if (!container) return;

  if (staffAdvices.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">アドバイスはまだありません</p>';
    return;
  }

  container.innerHTML = staffAdvices.map(advice => `
    <div class="card mb-3">
      <div class="flex items-start gap-4">
        <i class="fas fa-user-md text-3xl text-primary"></i>
        <div class="flex-1">
          <div class="flex justify-between items-start mb-2">
            <div>
              <h4 class="font-semibold text-lg">${advice.staff_name}</h4>
              <span class="badge badge-primary">${getAdviceTypeLabel(advice.advice_type)}</span>
            </div>
            <span class="text-sm text-gray-500">${dayjs(advice.created_at).format('YYYY/MM/DD')}</span>
          </div>
          <p class="text-gray-700">${advice.advice_text}</p>
        </div>
      </div>
    </div>
  `).join('');
}

function renderHealthLogs() {
  const container = document.getElementById('health-logs-container');
  if (!container) return;

  if (healthLogs.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">ログはまだありません</p>';
    return;
  }

  container.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead>
          <tr>
            <th>日付</th>
            <th>体重</th>
            <th>体脂肪率</th>
            <th>筋肉量</th>
            <th>食事</th>
            <th>運動</th>
            <th>睡眠</th>
            <th>気分</th>
            <th>AI解析</th>
          </tr>
        </thead>
        <tbody>
          ${healthLogs.map(log => `
            <tr>
              <td class="whitespace-nowrap">${dayjs(log.log_date).format('YYYY/MM/DD')}</td>
              <td>${log.weight ? log.weight + 'kg' : '-'}</td>
              <td>${log.body_fat_percentage ? log.body_fat_percentage + '%' : '-'}</td>
              <td>${log.muscle_mass ? log.muscle_mass + 'kg' : '-'}</td>
              <td>${log.meal_type ? getMealTypeLabel(log.meal_type) : '-'}</td>
              <td>${log.exercise_type || '-'}</td>
              <td>${log.sleep_hours ? log.sleep_hours + 'h' : '-'}</td>
              <td>${log.mood ? getMoodLabel(log.mood) : '-'}</td>
              <td class="max-w-xs truncate">${log.ai_analysis || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderChart() {
  const canvas = document.getElementById('healthChart');
  if (!canvas) return;

  const dates = healthLogs.map(log => dayjs(log.log_date).format('MM/DD')).reverse();
  const weights = healthLogs.map(log => log.weight).reverse();
  const bodyFats = healthLogs.map(log => log.body_fat_percentage).reverse();

  new Chart(canvas, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: '体重 (kg)',
          data: weights,
          borderColor: '#FF6B9D',
          backgroundColor: 'rgba(255, 107, 157, 0.1)',
          yAxisID: 'y',
        },
        {
          label: '体脂肪率 (%)',
          data: bodyFats,
          borderColor: '#4299E1',
          backgroundColor: 'rgba(66, 153, 225, 0.1)',
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { type: 'linear', position: 'left', title: { display: true, text: '体重 (kg)' } },
        y1: { type: 'linear', position: 'right', title: { display: true, text: '体脂肪率 (%)' }, grid: { drawOnChartArea: false } },
      },
    },
  });
}

// ========== ヘルパー関数 ==========
function getAdviceTypeLabel(type) {
  const labels = { diet: '食事', exercise: '運動', lifestyle: '生活習慣', general: '総合' };
  return labels[type] || type;
}

function getMealTypeLabel(type) {
  const labels = { breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食' };
  return labels[type] || type;
}

function getMoodLabel(mood) {
  const labels = { excellent: '最高', good: '良い', normal: '普通', bad: '悪い', terrible: '最悪' };
  return labels[mood] || mood;
}

// ========== 初期化 ==========
async function init() {
  authToken = localStorage.getItem('authToken');
  if (!authToken) {
    alert('ログインしてください');
    window.location.href = '/';
    return;
  }

  await loadUserData();
}

document.addEventListener('DOMContentLoaded', init);
