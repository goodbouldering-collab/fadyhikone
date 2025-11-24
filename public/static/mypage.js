// マイページ - ファディー彦根

// 状態管理
let currentUser = null;
let healthLogs = [];
let advices = [];
let opinions = [];
let charts = {};
let announcements = [];

// ページ初期化
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthAndLoad();
});

// 認証チェックとデータロード
async function checkAuthAndLoad() {
  const token = getToken();
  if (!token) {
    showToast('ログインが必要です', 'warning');
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
    return;
  }
  
  try {
    const response = await apiCall('/api/auth/verify');
    if (response.success) {
      currentUser = response.data;
      setUserData(currentUser);
      await loadAllData();
      renderPage();
    }
  } catch (error) {
    showToast('認証エラーが発生しました', 'error');
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
  }
}

// すべてのデータをロード
async function loadAllData() {
  try {
    const [logsRes, advicesRes, opinionsRes, announcementsRes] = await Promise.all([
      apiCall('/api/health-logs'),
      apiCall('/api/advices'),
      apiCall(`/api/opinions/user/${currentUser.id}`),
      apiCall('/api/announcements'),
    ]);
    
    if (logsRes.success) healthLogs = logsRes.data;
    if (advicesRes.success) advices = advicesRes.data;
    if (opinionsRes.success) opinions = opinionsRes.data;
    if (announcementsRes.success) announcements = announcementsRes.data;
  } catch (error) {
    showToast('データの読み込みに失敗しました', 'error');
  }
}

// ページレンダリング
function renderPage() {
  const root = document.getElementById('root');
  root.innerHTML = `
    ${renderHeader()}
    ${renderUserProfile()}
    ${renderStatsSection()}
    ${renderChartsSection()}
    ${renderHealthLogsTable()}
    ${renderOpinionBox()}
    ${renderSettingsSection()}
  `;
  
  // グラフ描画
  setTimeout(() => {
    renderCharts();
  }, 100);
  
  // デフォルトで基本情報タブを表示
  setTimeout(() => {
    showSettingsTab('profile');
  }, 150);
}

// 共通ヘッダー（マイページ用）
function renderHeader() {
  return `
    <header class="bg-white shadow-sm sticky top-0 z-50">
      <div class="container mx-auto px-6 md:px-8 py-3">
        <div class="flex justify-between items-center">
          <a href="/" class="flex items-center gap-1.5">
            <i class="fas fa-dumbbell text-base" style="color: var(--color-primary)"></i>
            <h1 class="text-base font-bold" style="color: var(--color-primary)">ファディー彦根</h1>
          </a>
          
          <nav class="flex items-center gap-2">
            <div class="flex items-center gap-2">
              <span class="hidden sm:flex items-center gap-1.5 text-xs text-gray-700">
                <i class="fas fa-user-circle text-primary text-sm"></i>
                <span class="font-medium">${currentUser.name}さん</span>
              </span>
              <button onclick="logout()" class="px-3 py-2 text-sm text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition">
                <i class="fas fa-sign-out-alt mr-1.5"></i>
                ログアウト
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  `;
}

// ユーザープロフィール（コンパクト版）
function renderUserProfile() {
  return `
    <section class="gradient-bg text-white py-8">
      <div class="container mx-auto px-6 md:px-8">
        <div class="max-w-6xl mx-auto">
          <div class="text-center">
            <div class="flex items-center justify-center gap-3 mb-2">
              <h2 class="text-3xl md:text-4xl font-bold">マイページ</h2>
              ${currentUser?.role === 'admin' ? `
                <a href="/admin" class="px-3 py-2 text-sm bg-white/20 hover:bg-white/30 text-white rounded-lg transition backdrop-blur-sm border border-white/30">
                  <i class="fas fa-user-shield mr-1.5"></i>
                  管理ページ
                </a>
              ` : ''}
            </div>
            <p class="text-base opacity-90">あなたの健康データを分析・管理</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

// 統計・分析セクション（新機能）
function renderStatsSection() {
  // 週間統計を計算
  const last7Days = healthLogs.slice(0, 7);
  const weeklyCalories = last7Days.reduce((sum, log) => sum + (log.meal_calories || 0), 0);
  const weeklyExercise = last7Days.reduce((sum, log) => sum + (log.exercise_minutes || 0), 0);
  const avgCalories = last7Days.length > 0 ? Math.round(weeklyCalories / last7Days.length) : 0;
  const avgExercise = last7Days.length > 0 ? Math.round(weeklyExercise / last7Days.length) : 0;
  
  // 月間統計を計算
  const last30Days = healthLogs.slice(0, 30);
  const monthlyLogs = last30Days.length;
  const consistencyRate = Math.round((monthlyLogs / 30) * 100);
  
  // 健康スコアを計算（簡易版）
  const latestLog = healthLogs[0];
  let healthScore = 0;
  if (latestLog) {
    if (latestLog.weight) healthScore += 20;
    if (latestLog.meal_calories) healthScore += 20;
    if (latestLog.exercise_minutes && latestLog.exercise_minutes >= 30) healthScore += 30;
    if (latestLog.sleep_hours && latestLog.sleep_hours >= 7) healthScore += 30;
  }
  
  return `
    <section class="bg-gradient-to-b from-white to-gray-50 py-8">
      <div class="container mx-auto px-6 md:px-8">
        <div class="max-w-6xl mx-auto">
          
          <!-- コンパクトダイジェスト：4カラムグリッド -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-1.5 mb-2">
            <!-- カロリー -->
            <div class="bg-gradient-to-br from-pink-50 to-rose-50 p-2 rounded-lg shadow-sm">
              <div class="flex items-center gap-1 mb-1">
                <i class="fas fa-fire text-primary text-xs"></i>
                <span class="text-xs font-bold text-gray-700">カロリー</span>
              </div>
              <div class="flex items-baseline gap-1">
                <span class="text-xl font-bold text-gray-800">${avgCalories}</span>
                <span class="text-xs text-gray-500">kcal</span>
              </div>
            </div>
            
            <!-- 運動 -->
            <div class="bg-gradient-to-br from-blue-50 to-cyan-50 p-2 rounded-lg shadow-sm">
              <div class="flex items-center gap-1 mb-1">
                <i class="fas fa-running text-blue-500 text-xs"></i>
                <span class="text-xs font-bold text-gray-700">運動</span>
              </div>
              <div class="flex items-baseline gap-1">
                <span class="text-xl font-bold text-gray-800">${avgExercise}</span>
                <span class="text-xs text-gray-500">分</span>
              </div>
            </div>
            
            <!-- 継続率 -->
            <div class="bg-gradient-to-br from-green-50 to-emerald-50 p-2 rounded-lg shadow-sm">
              <div class="flex items-center gap-1 mb-1">
                <i class="fas fa-calendar-check text-green-500 text-xs"></i>
                <span class="text-xs font-bold text-gray-700">継続率</span>
              </div>
              <div class="flex items-baseline gap-1">
                <span class="text-xl font-bold text-gray-800">${consistencyRate}</span>
                <span class="text-xs text-gray-500">%</span>
              </div>
            </div>
            
            <!-- 健康スコア -->
            <div class="bg-gradient-to-br from-yellow-50 to-amber-50 p-2 rounded-lg shadow-sm">
              <div class="flex items-center gap-1 mb-1">
                <i class="fas fa-star text-yellow-500 text-xs"></i>
                <span class="text-xs font-bold text-gray-700">スコア</span>
              </div>
              <div class="flex items-baseline gap-1">
                <span class="text-xl font-bold text-gray-800">${healthScore}</span>
                <span class="text-xs text-gray-500">点</span>
              </div>
            </div>
          </div>
          
          <!-- チェックリスト（1行コンパクト表示） -->
          <div class="bg-white/40 backdrop-blur-sm p-2 rounded-lg shadow-sm mb-2 border border-white/50 hover:bg-white/50 hover:shadow-md transition-all duration-200">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <i class="fas ${latestLog?.weight ? 'fa-check-circle text-green-500' : 'fa-circle text-gray-300'} text-xs"></i>
                <span class="text-xs text-gray-600">体重</span>
              </div>
              <div class="flex items-center gap-1.5">
                <i class="fas ${latestLog?.meal_calories ? 'fa-check-circle text-green-500' : 'fa-circle text-gray-300'} text-xs"></i>
                <span class="text-xs text-gray-600">食事</span>
              </div>
              <div class="flex items-center gap-1.5">
                <i class="fas ${(latestLog?.exercise_minutes && latestLog.exercise_minutes >= 30) ? 'fa-check-circle text-green-500' : 'fa-circle text-gray-300'} text-xs"></i>
                <span class="text-xs text-gray-600">運動30分</span>
              </div>
              <div class="flex items-center gap-1.5">
                <i class="fas ${(latestLog?.sleep_hours && latestLog.sleep_hours >= 7) ? 'fa-check-circle text-green-500' : 'fa-circle text-gray-300'} text-xs"></i>
                <span class="text-xs text-gray-600">睡眠7h</span>
              </div>
            </div>
          </div>
          
          <!-- 今日のAI/スタッフアドバイス（常に表示） -->
          ${renderTodayAdvices()}
          
        </div>
      </div>
    </section>
  `;
}

// 日付ごとのアドバイスセクション（AI + スタッフ）
function renderTodayAdvices() {
  // アドバイスを日付ごとにグループ化
  const advicesByDate = {};
  advices.slice(0, 7).forEach(advice => {
    const date = advice.log_date;
    if (!advicesByDate[date]) {
      advicesByDate[date] = { ai: [], staff: [] };
    }
    if (advice.advice_source === 'ai') {
      advicesByDate[date].ai.push(advice);
    } else {
      advicesByDate[date].staff.push(advice);
    }
  });
  
  const dates = Object.keys(advicesByDate).sort().reverse();
  
  if (dates.length === 0) {
    return `
      <div class="mt-2 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 rounded-xl shadow-sm border border-purple-100 text-center">
        <i class="fas fa-info-circle text-gray-400 text-2xl mb-2"></i>
        <p class="text-sm text-gray-600">まだアドバイスがありません</p>
      </div>
    `;
  }
  
  return `
    <div class="mt-2 space-y-2">
      ${dates.map(date => {
        const aiAdvices = advicesByDate[date].ai;
        const staffAdvices = advicesByDate[date].staff;
        
        return `
          <div class="bg-gradient-to-br from-indigo-50/60 via-purple-50/60 to-pink-50/60 backdrop-blur-sm p-3 rounded-xl shadow-sm border border-purple-100/50 hover:from-indigo-50/80 hover:via-purple-50/80 hover:to-pink-50/80 hover:shadow-md transition-all duration-200">
            <h4 class="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i class="fas fa-calendar-day text-primary"></i>
              ${dayjs(date).format('YYYY年M月D日')}のアドバイス
            </h4>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <!-- AIアドバイス -->
        <div class="bg-white/40 backdrop-blur-sm p-2 rounded-lg shadow-sm border border-white/50 hover:bg-white/50 hover:shadow-md transition-all duration-200">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <i class="fas fa-robot text-white text-sm"></i>
            </div>
            <div class="flex-1">
              <h5 class="text-xs font-bold text-gray-800">AIアドバイス</h5>
              ${aiAdvices.length > 0 && aiAdvices[0].confidence_score ? `
                <div class="flex items-center gap-1">
                  <div class="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-blue-500 to-purple-500" style="width: ${(aiAdvices[0].confidence_score * 100)}%"></div>
                  </div>
                  <span class="text-xs text-gray-500">信頼度 ${Math.round(aiAdvices[0].confidence_score * 100)}%</span>
                </div>
              ` : ''}
            </div>
          </div>
          
          ${aiAdvices.length > 0 ? `
            <div class="space-y-2">
              ${aiAdvices.map(advice => `
                <div class="relative">
                  <button 
                    type="button"
                    id="speak-btn-${advice.id}"
                    onclick="speakAdvice(${advice.id}, '${advice.title.replace(/'/g, "\\'")}', '${advice.content.replace(/'/g, "\\'")}')"
                    class="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center bg-blue-100 hover:bg-blue-200 rounded-full transition-colors z-10"
                    title="音声で読み上げる">
                    <i class="fas fa-volume-up text-blue-600 text-xs"></i>
                  </button>
                  <div class="text-xs text-gray-700 line-clamp-3">
                    <strong class="text-gray-800">${advice.title}</strong><br>
                    ${advice.content.substring(0, 100)}${advice.content.length > 100 ? '...' : ''}
                  </div>
                  ${advice.content.length > 100 ? `
                    <button onclick="showAdviceDetail(${advice.id})" class="text-xs text-primary hover:underline mt-1">
                      もっと見る →
                    </button>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="text-xs text-gray-500 py-2">
              <i class="fas fa-info-circle mr-1"></i>
              今日のAI分析はまだありません
            </div>
          `}
        </div>
        
        <!-- スタッフアドバイス -->
        <div class="bg-white/40 backdrop-blur-sm p-2 rounded-lg shadow-sm border border-white/50 hover:bg-white/50 hover:shadow-md transition-all duration-200">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
              <i class="fas fa-user-nurse text-white text-sm"></i>
            </div>
            <h5 class="text-xs font-bold text-gray-800">スタッフアドバイス</h5>
          </div>
          
          ${staffAdvices.length > 0 ? `
            <div class="space-y-2">
              ${staffAdvices.map(advice => `
                <div class="relative">
                  <button 
                    type="button"
                    id="speak-btn-${advice.id}"
                    onclick="speakAdvice(${advice.id}, '${advice.title.replace(/'/g, "\\'")}', '${advice.content.replace(/'/g, "\\'")}')"
                    class="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center bg-pink-100 hover:bg-pink-200 rounded-full transition-colors z-10"
                    title="音声で読み上げる">
                    <i class="fas fa-volume-up text-pink-600 text-xs"></i>
                  </button>
                  <div class="text-xs text-gray-700">
                    <div class="flex items-center gap-1 mb-1">
                      <i class="fas fa-user-circle text-primary text-xs"></i>
                      <span class="font-medium text-gray-800">${advice.staff_name}</span>
                    </div>
                    <strong class="text-gray-800">${advice.title}</strong><br>
                    <div class="line-clamp-3">${advice.content.substring(0, 100)}${advice.content.length > 100 ? '...' : ''}</div>
                  </div>
                  ${advice.content.length > 100 ? `
                    <button onclick="showAdviceDetail(${advice.id})" class="text-xs text-primary hover:underline mt-1">
                      もっと見る →
                    </button>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="text-xs text-gray-500 py-2">
              <i class="fas fa-info-circle mr-1"></i>
              今日のスタッフアドバイスはまだありません
            </div>
          `}
        </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// アドバイスフィルター状態
let adviceFilter = {
  category: 'all', // all, meal, exercise, mental, sleep, weight
  source: 'all',   // all, ai, staff
  readStatus: 'all' // all, unread, read
};

// アドバイス一覧
function renderAdvicesList() {
  if (advices.length === 0) {
    return '';
  }
  
  // フィルター適用
  let filteredAdvices = advices.filter(advice => {
    if (adviceFilter.category !== 'all' && advice.advice_type !== adviceFilter.category) return false;
    if (adviceFilter.source !== 'all' && advice.advice_source !== adviceFilter.source) return false;
    if (adviceFilter.readStatus === 'unread' && advice.is_read) return false;
    if (adviceFilter.readStatus === 'read' && !advice.is_read) return false;
    return true;
  });
  
  return `
    <section id="advices-section" class="bg-gradient-to-b from-gray-50/50 to-white/50 backdrop-blur-sm py-8">
      <div class="container mx-auto px-6 md:px-8">
        <div class="max-w-6xl mx-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-2xl md:text-3xl font-bold text-gray-800">
              <i class="fas fa-comment-medical mr-2" style="color: var(--color-primary)"></i>
              アドバイス履歴
            </h3>
            <button onclick="markAllAdvicesAsRead()" class="text-xs text-primary hover:underline">
              すべて既読にする
            </button>
          </div>
          
          <!-- フィルター -->
          <div class="bg-gradient-to-br from-purple-50 to-pink-50 p-2 rounded-lg mb-2 shadow-sm">
            <div class="flex flex-wrap gap-2">
              <!-- カテゴリーフィルター -->
              <div class="flex-1 min-w-[200px]">
                <label class="text-xs font-medium text-gray-700 mb-1 block">カテゴリー</label>
                <select id="category-filter" onchange="updateAdviceFilter('category', this.value)" 
                  class="w-full px-2 py-1 text-xs border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="all">すべて</option>
                  <option value="meal">🍽️ 食事</option>
                  <option value="exercise">🏃 運動</option>
                  <option value="mental">💭 メンタル</option>
                  <option value="sleep">😴 睡眠</option>
                  <option value="weight">⚖️ 体重管理</option>
                </select>
              </div>
              
              <!-- ソースフィルター -->
              <div class="flex-1 min-w-[150px]">
                <label class="text-xs font-medium text-gray-700 mb-1 block">提供元</label>
                <select id="source-filter" onchange="updateAdviceFilter('source', this.value)"
                  class="w-full px-2 py-1 text-xs border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="all">すべて</option>
                  <option value="ai">🤖 AI分析</option>
                  <option value="staff">👨‍⚕️ スタッフ</option>
                </select>
              </div>
              
              <!-- 既読/未読フィルター -->
              <div class="flex-1 min-w-[150px]">
                <label class="text-xs font-medium text-gray-700 mb-1 block">既読状態</label>
                <select id="read-status-filter" onchange="updateAdviceFilter('readStatus', this.value)"
                  class="w-full px-2 py-1 text-xs border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="all">すべて</option>
                  <option value="unread">未読のみ</option>
                  <option value="read">既読のみ</option>
                </select>
              </div>
            </div>
            
            <!-- フィルター結果 -->
            <div class="text-xs text-gray-600 mt-2">
              <i class="fas fa-filter mr-1"></i>
              ${filteredAdvices.length}件のアドバイス / 全${advices.length}件
            </div>
          </div>
          
          <!-- アドバイスリスト -->
          <div class="space-y-2">
            ${filteredAdvices.length > 0 ? filteredAdvices.map(advice => {
              const isAI = advice.advice_source === 'ai';
              const categoryIcons = {
                meal: '🍽️', exercise: '🏃', mental: '💭', sleep: '😴', weight: '⚖️',
                diet: '🍽️', general: '📋'
              };
              const categoryIcon = categoryIcons[advice.advice_type] || '📋';
              
              return `
              <div class="card-hover bg-white/30 backdrop-blur-sm p-2 rounded-lg border-l-4 ${advice.is_read ? 'opacity-60' : ''}" 
                style="border-color: var(--color-${getAdviceColor(advice.advice_type)})">
                <div class="flex justify-between items-start mb-1">
                  <div class="flex-1">
                    <div class="flex items-center gap-1 mb-1">
                      <span class="text-xs">${categoryIcon}</span>
                      <span class="badge badge-${getAdviceColor(advice.advice_type)} text-xs">${getAdviceTypeLabel(advice.advice_type)}</span>
                      ${isAI ? '<span class="badge badge-info text-xs">🤖 AI</span>' : '<span class="badge badge-success text-xs">👨‍⚕️ スタッフ</span>'}
                      ${!advice.is_read ? '<span class="badge badge-error text-xs">未読</span>' : ''}
                      ${advice.log_date ? `<span class="text-xs text-gray-500">${advice.log_date}</span>` : ''}
                    </div>
                    <h4 class="text-sm font-bold">${advice.title}</h4>
                  </div>
                  <span class="text-xs text-gray-500">${formatRelativeTime(advice.created_at)}</span>
                </div>
                <p class="text-xs text-gray-700 mb-1 line-clamp-2">${advice.content}</p>
                <div class="flex justify-between items-center">
                  <div class="text-xs text-gray-600">
                    <i class="fas ${isAI ? 'fa-robot' : 'fa-user-nurse'} mr-1"></i>
                    ${advice.staff_name || 'AI Assistant'}
                    ${isAI && advice.confidence_score ? ` (信頼度 ${Math.round(advice.confidence_score * 100)}%)` : ''}
                  </div>
                  <div class="flex gap-2">
                    <button onclick="showAdviceDetail(${advice.id})" class="text-primary hover:underline text-xs">
                      詳細
                    </button>
                    ${!advice.is_read ? `
                      <button onclick="markAdviceAsRead(${advice.id})" class="text-primary hover:underline text-xs">
                        既読
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
            }).join('') : `
              <div class="text-center py-8 text-gray-500">
                <i class="fas fa-filter text-4xl mb-2"></i>
                <p class="text-sm">フィルター条件に一致するアドバイスがありません</p>
              </div>
            `}
          </div>
        </div>
      </div>
    </section>
  `;
}

// フィルター更新
function updateAdviceFilter(filterType, value) {
  adviceFilter[filterType] = value;
  const content = document.getElementById('content');
  if (content) {
    content.innerHTML = renderAdvicesList();
  }
}

// すべて既読にする
async function markAllAdvicesAsRead() {
  if (!confirm('すべてのアドバイスを既読にしますか？')) return;
  
  try {
    const response = await apiCall('/api/advices/mark-all-read', {
      method: 'PUT'
    });
    
    if (response.success) {
      showToast('すべてのアドバイスを既読にしました', 'success');
      await loadAdvices();
      await loadUnreadCount();
      showSettingsTab('advices');
    }
  } catch (error) {
    showToast('既読処理に失敗しました', 'error');
  }
}

// 質問・相談セクション
function renderOpinionBox() {
  const pendingOpinions = opinions.filter(op => op.status === 'pending');
  const answeredOpinions = opinions.filter(op => op.status === 'answered');
  
  return `
    <section id="qa-section" class="bg-gradient-to-br from-purple-50 to-pink-50 py-8">
      <div class="container mx-auto px-6 md:px-8">
        <div class="max-w-6xl mx-auto">
          <h3 class="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            <i class="fas fa-comments mr-2" style="color: var(--color-primary)"></i>
            質問・相談
          </h3>
          
          <!-- 質問フォーム（アイコン削除、幅広く） -->
          <div class="bg-white/30 backdrop-blur-sm p-2 rounded-xl shadow-sm mb-2 border border-white/40">
            <textarea 
              id="opinion-question" 
              rows="3" 
              class="w-full px-2 py-2 text-sm bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition border border-purple-100 shadow-sm"
              placeholder="トレーニングや食事、健康に関する質問・相談をお気軽にどうぞ..."
            ></textarea>
            <div class="flex justify-end mt-2">
              <button 
                onclick="submitOpinion()" 
                class="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-opacity-90 transition shadow-sm font-medium"
              >
                <i class="fas fa-paper-plane mr-1"></i>
                送信
              </button>
            </div>
          </div>
          
          <!-- 質問履歴 -->
          ${opinions.length > 0 ? `
            <div class="space-y-4">
              <!-- 未回答の質問 -->
              ${pendingOpinions.length > 0 ? `
                <div>
                  <h4 class="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <i class="fas fa-hourglass-half text-orange-500"></i>
                    回答待ち（${pendingOpinions.length}件）
                  </h4>
                  <div class="space-y-2">
                    ${pendingOpinions.map(opinion => `
                      <div class="bg-white/40 backdrop-blur-sm p-2 rounded-xl shadow-sm border-l-2 border-orange-400">
                        <div class="flex justify-between items-start mb-1">
                          <div class="flex items-center gap-1">
                            <i class="fas fa-clock text-orange-500 text-xs"></i>
                            <span class="text-xs text-gray-500">${formatDateTime(opinion.created_at)}</span>
                          </div>
                          <span class="badge badge-warning text-xs">回答待ち</span>
                        </div>
                        <div class="bg-white/20 backdrop-blur-sm p-2 rounded mb-1">
                          <p class="text-xs text-gray-800"><strong>質問:</strong> ${opinion.question}</p>
                        </div>
                        <p class="text-xs text-gray-500 italic">スタッフが確認中です。しばらくお待ちください。</p>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
              
              <!-- 回答済みの質問 -->
              ${answeredOpinions.length > 0 ? `
                <div>
                  <h4 class="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <i class="fas fa-check-circle text-green-500"></i>
                    回答済み（${answeredOpinions.length}件）
                  </h4>
                  <div class="space-y-2">
                    ${answeredOpinions.map(opinion => `
                      <div class="bg-white/40 backdrop-blur-sm p-2 rounded-xl shadow-sm border-l-2 border-green-400">
                        <div class="flex justify-between items-start mb-1">
                          <div class="flex items-center gap-1">
                            <i class="fas fa-calendar text-green-500 text-xs"></i>
                            <span class="text-xs text-gray-500">質問: ${formatDateTime(opinion.created_at)}</span>
                          </div>
                          <span class="badge badge-success text-xs">回答済み</span>
                        </div>
                        
                        <div class="bg-gray-50 p-2 rounded mb-1.5">
                          <p class="text-xs text-gray-800"><strong>質問:</strong> ${opinion.question}</p>
                        </div>
                        
                        <div class="bg-green-50 p-2 rounded border-l-2 border-green-500">
                          <div class="flex items-center gap-1 mb-1">
                            <i class="fas fa-user-nurse text-green-600 text-xs"></i>
                            <span class="text-xs font-medium text-green-700">${opinion.answered_by} からの回答:</span>
                            <span class="text-xs text-gray-500">${formatDateTime(opinion.answered_at)}</span>
                          </div>
                          <p class="text-xs text-gray-800 whitespace-pre-wrap">${opinion.answer}</p>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          ` : `
            <div class="bg-white/30 backdrop-blur-sm p-4 rounded-xl shadow-sm text-center border border-white/40">
              <div class="w-12 h-12 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
                <i class="fas fa-comments text-xl text-gray-300"></i>
              </div>
              <p class="text-xs text-gray-500">まだ質問がありません。お気軽にご相談ください！</p>
            </div>
          `}
        </div>
      </div>
    </section>
  `;
}

// 健康ログテーブル (横スクロール)
function renderHealthLogsTable() {
  if (healthLogs.length === 0) {
    return `
      <section class="bg-gradient-to-b from-white/50 to-gray-50/50 backdrop-blur-sm py-8">
        <div class="container mx-auto px-6 md:px-8">
          <div class="max-w-6xl mx-auto text-center">
            <i class="fas fa-clipboard-list text-5xl text-gray-300 mb-3"></i>
            <p class="text-gray-500 text-base">まだ健康ログがありません</p>
            <a href="/" class="inline-block mt-3 px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90 transition">
              ログを記録する
            </a>
          </div>
        </div>
      </section>
    `;
  }
  
  return `
    <section class="bg-gray-50 py-8">
      <div class="container mx-auto px-6 md:px-8">
        <div class="max-w-6xl mx-auto">
          <div class="mb-2">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-2xl md:text-3xl font-bold text-gray-800">
                <i class="fas fa-table mr-2" style="color: var(--color-primary)"></i>
                健康ログ履歴
              </h3>
              <div class="flex gap-2">
                <button onclick="exportHealthLogs()" class="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
                  <i class="fas fa-download mr-1"></i>
                  CSVエクスポート
                </button>
                <button onclick="showAddLogModal()" class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90 transition">
                  <i class="fas fa-plus mr-1"></i>
                  ログを追加
                </button>
              </div>
            </div>
            
            <!-- フィルター機能 -->
            <div class="bg-white/30 backdrop-blur-sm p-3 rounded-lg shadow-sm flex flex-wrap items-center gap-2 border border-white/40">
              <div class="flex items-center gap-2">
                <label class="text-xs font-medium text-gray-600">期間:</label>
                <select id="log-filter-period" onchange="filterHealthLogs()" class="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="all">全期間</option>
                  <option value="7">過去7日</option>
                  <option value="30" selected>過去30日</option>
                  <option value="90">過去90日</option>
                </select>
              </div>
              
              <div class="flex items-center gap-2">
                <label class="text-xs font-medium text-gray-600">運動:</label>
                <select id="log-filter-exercise" onchange="filterHealthLogs()" class="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="all">すべて</option>
                  <option value="yes">あり</option>
                  <option value="no">なし</option>
                </select>
              </div>
              
              <div class="flex items-center gap-2">
                <label class="text-xs font-medium text-gray-600">体重記録:</label>
                <select id="log-filter-weight" onchange="filterHealthLogs()" class="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="all">すべて</option>
                  <option value="yes">あり</option>
                  <option value="no">なし</option>
                </select>
              </div>
              
              <button onclick="resetFilters()" class="ml-auto text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition">
                <i class="fas fa-undo mr-1"></i>
                リセット
              </button>
              
              <div class="w-full mt-2 text-xs text-gray-600">
                <i class="fas fa-info-circle mr-1"></i>
                表示中: <span id="filtered-count" class="font-bold text-primary">${healthLogs.length}</span> 件 / 全 ${healthLogs.length} 件
              </div>
            </div>
          </div>
          
          <div class="bg-white/20 backdrop-blur-md rounded-lg shadow-md overflow-hidden border border-white/30">
            <div class="scroll-container overflow-x-auto">
              <table class="table min-w-full text-sm">
                <thead>
                  <tr>
                    <th class="sticky left-0 bg-primary z-10 text-xs whitespace-nowrap w-28">日付</th>
                    <th class="text-xs whitespace-nowrap w-20">体重</th>
                    <th class="text-xs whitespace-nowrap w-24">体脂肪率</th>
                    <th class="text-xs whitespace-nowrap w-20">体温</th>
                    <th class="text-xs whitespace-nowrap w-20">睡眠</th>
                    <th class="text-xs whitespace-nowrap w-24">カロリー</th>
                    <th class="text-xs whitespace-nowrap w-20">運動</th>
                    <th class="text-xs whitespace-nowrap">運動記録</th>
                    <th class="sticky right-0 bg-primary z-10 text-xs whitespace-nowrap w-24">操作</th>
                  </tr>
                </thead>
                <tbody>
                  ${healthLogs.map(log => `
                    <tr>
                      <td class="sticky left-0 bg-white z-10 font-medium text-xs whitespace-nowrap">${formatDate(log.log_date)}</td>
                      <td class="text-xs whitespace-nowrap">${log.weight ? log.weight + ' kg' : '--'}</td>
                      <td class="text-xs whitespace-nowrap">${log.body_fat_percentage ? log.body_fat_percentage + ' %' : '--'}</td>
                      <td class="text-xs whitespace-nowrap">${log.body_temperature ? log.body_temperature + ' ℃' : '--'}</td>
                      <td class="text-xs whitespace-nowrap">${log.sleep_hours ? log.sleep_hours + ' 時間' : '--'}</td>
                      <td class="text-xs whitespace-nowrap">${log.meal_calories ? log.meal_calories + ' kcal' : '--'}</td>
                      <td class="text-xs whitespace-nowrap">${log.exercise_minutes ? log.exercise_minutes + ' 分' : '--'}</td>
                      <td class="text-xs max-w-xs truncate">${log.condition_note || '--'}</td>
                      <td class="sticky right-0 bg-white z-10 whitespace-nowrap">
                        <div class="flex gap-1.5">
                          <button onclick="showEditLogModal(${log.id})" class="text-blue-500 hover:text-blue-700 text-xs">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button onclick="deleteLog(${log.id})" class="text-red-500 hover:text-red-700 text-xs">
                            <i class="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

// グラフセクション
function renderChartsSection() {
  return `
    <section class="bg-gradient-to-b from-gray-50/50 to-white/50 backdrop-blur-sm py-8">
      <div class="container mx-auto px-6 md:px-8">
        <div class="max-w-6xl mx-auto">
          <h3 class="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            <i class="fas fa-chart-line mr-2" style="color: var(--color-primary)"></i>
            健康データ推移（最新30日）
          </h3>
          
          <div class="bg-white/20 backdrop-blur-sm p-2 rounded-lg border border-white/30">
            <div style="height: 350px;">
              <canvas id="combined-chart"></canvas>
            </div>
            
            <!-- 凡例 -->
            <div class="flex flex-wrap justify-center gap-2 mt-2">
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded" style="background-color: #3b82f6;"></div>
                <span class="text-sm">体重 (kg)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded" style="background-color: #ef4444;"></div>
                <span class="text-sm">体脂肪率 (%)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded" style="background-color: #8b5cf6;"></div>
                <span class="text-sm">睡眠時間 (h)</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 rounded" style="background-color: #10b981;"></div>
                <span class="text-sm">カロリー (kcal ÷ 100)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

// グラフ描画（重ねたグラフ）
function renderCharts() {
  const sortedLogs = [...healthLogs].reverse().slice(-30); // 最新30日分
  const labels = sortedLogs.map(log => dayjs(log.log_date).format('M/D'));
  
  // 統合グラフ
  if (document.getElementById('combined-chart')) {
    const weightData = sortedLogs.map(log => log.weight || null);
    const bodyfatData = sortedLogs.map(log => log.body_fat_percentage || null);
    const sleepData = sortedLogs.map(log => log.sleep_hours || null);
    const caloriesData = sortedLogs.map(log => log.meal_calories ? log.meal_calories / 100 : null); // 100で割ってスケール調整
    
    const ctx = document.getElementById('combined-chart').getContext('2d');
    charts.combined = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: '体重 (kg)',
            data: weightData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            yAxisID: 'y'
          },
          {
            label: '体脂肪率 (%)',
            data: bodyfatData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            yAxisID: 'y'
          },
          {
            label: '睡眠時間 (h)',
            data: sleepData,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            yAxisID: 'y'
          },
          {
            label: 'カロリー (kcal ÷ 100)',
            data: caloriesData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  if (context.dataset.label.includes('カロリー')) {
                    label += (context.parsed.y * 100).toFixed(0);
                  } else {
                    label += context.parsed.y.toFixed(1);
                  }
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: false,
            title: {
              display: true,
              text: '値'
            }
          },
          x: {
            display: true,
            title: {
              display: true,
              text: '日付'
            }
          }
        }
      }
    });
  }
}

// アドバイスを既読にする
async function markAdviceAsRead(adviceId) {
  try {
    const response = await apiCall(`/api/advices/${adviceId}/read`, { method: 'PUT' });
    if (response.success) {
      showToast('既読にしました', 'success');
      await loadAllData();
      renderPage();
    }
  } catch (error) {
    showToast('エラーが発生しました', 'error');
  }
}

// ログ追加モーダル
function showAddLogModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-5 max-w-2xl">
      <h3 class="text-lg font-bold mb-3">健康ログを追加</h3>
      <form id="add-log-form" class="space-y-3">
        <div>
          <label class="block text-xs font-medium mb-1">日付 *</label>
          <input type="date" name="log_date" required value="${dayjs().format('YYYY-MM-DD')}"
            class="w-full px-3 py-2 text-sm border rounded-lg">
        </div>
        
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium mb-1">体重 (kg)</label>
            <input type="number" step="0.1" name="weight" 
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">体脂肪率 (%)</label>
            <input type="number" step="0.1" name="body_fat_percentage" 
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">体温 (℃)</label>
            <input type="number" step="0.1" name="body_temperature" 
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">睡眠時間 (時間)</label>
            <input type="number" step="0.5" name="sleep_hours" 
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">運動時間 (分)</label>
            <input type="number" name="exercise_minutes" 
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
        </div>
        
        <div>
          <label class="block text-xs font-medium mb-1">運動記録</label>
          <textarea name="condition_note" rows="2" 
            placeholder="例：ベンチプレス60kg × 10回 × 3セット"
            class="w-full px-3 py-2 text-sm border rounded-lg"></textarea>
        </div>
        
        <div class="flex gap-2 justify-end">
          <button type="button" onclick="this.closest('.modal-backdrop').remove()" 
            class="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg">
            キャンセル
          </button>
          <button type="submit" class="px-3 py-1.5 text-sm bg-primary text-white hover:bg-opacity-90 rounded-lg">
            追加
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('add-log-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      log_date: formData.get('log_date'),
      weight: formData.get('weight') ? parseFloat(formData.get('weight')) : null,
      body_fat_percentage: formData.get('body_fat_percentage') ? parseFloat(formData.get('body_fat_percentage')) : null,
      body_temperature: formData.get('body_temperature') ? parseFloat(formData.get('body_temperature')) : null,
      sleep_hours: formData.get('sleep_hours') ? parseFloat(formData.get('sleep_hours')) : null,
      exercise_minutes: formData.get('exercise_minutes') ? parseInt(formData.get('exercise_minutes')) : null,
      condition_note: formData.get('condition_note') || null,
    };
    
    try {
      const response = await apiCall('/api/health-logs', { method: 'POST', data });
      if (response.success) {
        showToast('ログを追加しました', 'success');
        modal.remove();
        await loadAllData();
        renderPage();
      }
    } catch (error) {
      showToast('追加に失敗しました', 'error');
    }
  });
}

// ログ編集モーダル
function showEditLogModal(logId) {
  const log = healthLogs.find(l => l.id === logId);
  if (!log) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-5 max-w-2xl">
      <h3 class="text-lg font-bold mb-3">健康ログを編集</h3>
      <form id="edit-log-form" class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium mb-1">体重 (kg)</label>
            <input type="number" step="0.1" name="weight" value="${log.weight || ''}"
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">体脂肪率 (%)</label>
            <input type="number" step="0.1" name="body_fat_percentage" value="${log.body_fat_percentage || ''}"
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">体温 (℃)</label>
            <input type="number" step="0.1" name="body_temperature" value="${log.body_temperature || ''}"
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">睡眠時間 (時間)</label>
            <input type="number" step="0.5" name="sleep_hours" value="${log.sleep_hours || ''}"
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">運動時間 (分)</label>
            <input type="number" name="exercise_minutes" value="${log.exercise_minutes || ''}"
              class="w-full px-3 py-2 text-sm border rounded-lg">
          </div>
        </div>
        
        <div>
          <label class="block text-xs font-medium mb-1">運動記録</label>
          <textarea name="condition_note" rows="2" 
            placeholder="例：ベンチプレス60kg × 10回 × 3セット"
            class="w-full px-3 py-2 text-sm border rounded-lg">${log.condition_note || ''}</textarea>
        </div>
        
        <div class="flex gap-2 justify-end">
          <button type="button" onclick="this.closest('.modal-backdrop').remove()" 
            class="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg">
            キャンセル
          </button>
          <button type="submit" class="px-3 py-1.5 text-sm bg-primary text-white hover:bg-opacity-90 rounded-lg">
            更新
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('edit-log-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      weight: formData.get('weight') ? parseFloat(formData.get('weight')) : null,
      body_fat_percentage: formData.get('body_fat_percentage') ? parseFloat(formData.get('body_fat_percentage')) : null,
      body_temperature: formData.get('body_temperature') ? parseFloat(formData.get('body_temperature')) : null,
      sleep_hours: formData.get('sleep_hours') ? parseFloat(formData.get('sleep_hours')) : null,
      exercise_minutes: formData.get('exercise_minutes') ? parseInt(formData.get('exercise_minutes')) : null,
      condition_note: formData.get('condition_note') || null,
    };
    
    try {
      const response = await apiCall(`/api/health-logs/${logId}`, { method: 'PUT', data });
      if (response.success) {
        showToast('ログを更新しました', 'success');
        modal.remove();
        await loadAllData();
        renderPage();
      }
    } catch (error) {
      showToast('更新に失敗しました', 'error');
    }
  });
}

// ログ削除
async function deleteLog(logId) {
  showModal(
    '確認',
    'このログを削除してもよろしいですか？',
    async () => {
      try {
        const response = await apiCall(`/api/health-logs/${logId}`, { method: 'DELETE' });
        if (response.success) {
          showToast('ログを削除しました', 'success');
          await loadAllData();
          renderPage();
        }
      } catch (error) {
        showToast('削除に失敗しました', 'error');
      }
    }
  );
}

// オピニオン送信
async function submitOpinion() {
  const questionElement = document.getElementById('opinion-question');
  const question = questionElement.value.trim();
  
  if (!question) {
    showToast('質問を入力してください', 'warning');
    return;
  }
  
  try {
    const response = await apiCall('/api/opinions', {
      method: 'POST',
      data: { question }
    });
    
    if (response.success) {
      showToast('質問を送信しました', 'success');
      questionElement.value = '';
      await loadAllData();
      renderPage();
    }
  } catch (error) {
    showToast('送信に失敗しました', 'error');
  }
}

// 個人データ設定セクション
function renderSettingsSection() {
  return `
    <section class="bg-gradient-to-br from-blue-50 to-white py-8">
      <div class="container mx-auto px-6 md:px-8">
        <div class="max-w-6xl mx-auto">
          <h3 class="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            <i class="fas fa-cog mr-2" style="color: var(--color-primary)"></i>
            個人データ設定
          </h3>
          
          <!-- タブナビゲーション -->
          <div class="bg-white/20 backdrop-blur-md rounded-lg shadow-md overflow-hidden border border-white/30">
            <div class="flex border-b border-gray-200">
              <button onclick="showSettingsTab('profile')" id="settings-tab-profile" 
                class="settings-tab flex-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-50 transition border-b-2 border-transparent">
                <i class="fas fa-user-circle mr-1"></i>
                基本情報
              </button>
              <button onclick="showSettingsTab('body')" id="settings-tab-body" 
                class="settings-tab flex-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-50 transition border-b-2 border-transparent">
                <i class="fas fa-heartbeat mr-1"></i>
                身体情報
              </button>
              ${currentUser?.auth_provider === 'email' ? `
                <button onclick="showSettingsTab('password')" id="settings-tab-password" 
                  class="settings-tab flex-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-50 transition border-b-2 border-transparent">
                  <i class="fas fa-lock mr-1"></i>
                  パスワード変更
                </button>
              ` : ''}
            </div>
            
            <div id="settings-content" class="p-3">
              <!-- コンテンツはJavaScriptで動的に表示 -->
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

// 設定タブ切り替え
function showSettingsTab(tab) {
  // タブボタンのアクティブ状態を更新
  document.querySelectorAll('.settings-tab').forEach(btn => {
    btn.classList.remove('border-primary', 'text-primary');
    btn.classList.add('border-transparent', 'text-gray-600');
  });
  
  const activeTab = document.getElementById(`settings-tab-${tab}`);
  if (activeTab) {
    activeTab.classList.remove('border-transparent', 'text-gray-600');
    activeTab.classList.add('border-primary', 'text-primary');
  }
  
  // コンテンツを切り替え
  const content = document.getElementById('settings-content');
  if (tab === 'profile') {
    content.innerHTML = renderProfileSettings();
    // イベントリスナーを手動で登録
    setTimeout(() => {
      const form = document.getElementById('profile-form');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          await updateProfile();
        });
      }
    }, 0);
  } else if (tab === 'body') {
    content.innerHTML = renderBodySettings();
    // イベントリスナーを手動で登録
    setTimeout(() => {
      const form = document.getElementById('body-form');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          await updateProfile();
        });
      }
    }, 0);
  } else if (tab === 'password') {
    content.innerHTML = renderPasswordSettings();
    // イベントリスナーを手動で登録
    setTimeout(() => {
      const form = document.getElementById('password-form');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          await updatePassword();
        });
      }
    }, 0);
  }
}

// 基本情報設定フォーム
function renderProfileSettings() {
  return `
    <form id="profile-form" class="space-y-3">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            <i class="fas fa-user mr-1"></i> お名前 <span class="text-red-500">*</span>
          </label>
          <input type="text" id="profile-name" value="${currentUser?.name || ''}" required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            <i class="fas fa-envelope mr-1"></i> メールアドレス <span class="text-red-500">*</span>
          </label>
          <input type="email" id="profile-email" value="${currentUser?.email || ''}" required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            <i class="fas fa-phone mr-1"></i> 電話番号
          </label>
          <input type="tel" id="profile-phone" value="${currentUser?.phone || ''}"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            placeholder="090-1234-5678">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            <i class="fas fa-venus-mars mr-1"></i> 性別
          </label>
          <select id="profile-gender" 
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm">
            <option value="">選択してください</option>
            <option value="female" ${currentUser?.gender === 'female' ? 'selected' : ''}>女性</option>
            <option value="male" ${currentUser?.gender === 'male' ? 'selected' : ''}>男性</option>
            <option value="other" ${currentUser?.gender === 'other' ? 'selected' : ''}>その他</option>
          </select>
        </div>
      </div>
      
      <div class="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onclick="loadAllData(); renderPage();" 
          class="px-6 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
          <i class="fas fa-times mr-2"></i>
          キャンセル
        </button>
        <button type="submit" 
          class="px-6 py-2 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90 transition">
          <i class="fas fa-save mr-2"></i>
          保存する
        </button>
      </div>
    </form>
  `;
}

// 身体情報設定フォーム
function renderBodySettings() {
  return `
    <form id="body-form" class="space-y-3">
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div class="flex items-start gap-2">
          <i class="fas fa-info-circle text-blue-500 mt-0.5"></i>
          <div class="text-sm text-blue-800">
            <p class="font-medium mb-1">身長は個人データとして保持されます</p>
            <p class="text-xs">体重は毎日の健康ログで記録してください。BMI計算にはここで設定した身長が使用されます。</p>
          </div>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <i class="fas fa-ruler-vertical mr-1"></i> 身長 (cm)
        </label>
        <input type="number" id="body-height" value="${currentUser?.height || ''}" step="0.1" min="0" max="300"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          placeholder="160.0">
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <i class="fas fa-bullseye mr-1"></i> 目標・備考
        </label>
        <textarea id="body-goal" rows="3"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          placeholder="ダイエット、筋力アップ、健康維持など、あなたの目標を記入してください...">${currentUser?.goal || ''}</textarea>
      </div>
      
      <div class="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onclick="loadAllData(); renderPage();" 
          class="px-6 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
          <i class="fas fa-times mr-2"></i>
          キャンセル
        </button>
        <button type="submit" 
          class="px-6 py-2 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90 transition">
          <i class="fas fa-save mr-2"></i>
          保存する
        </button>
      </div>
    </form>
  `;
}

// パスワード変更フォーム
function renderPasswordSettings() {
  return `
    <form id="password-form" class="space-y-3 max-w-md">
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div class="flex items-start gap-2">
          <i class="fas fa-info-circle text-yellow-600 mt-1"></i>
          <div class="text-sm text-yellow-800">
            <p class="font-medium mb-1">パスワード変更について</p>
            <p>セキュリティ保護のため、現在のパスワードが必要です。新しいパスワードは8文字以上を推奨します。</p>
          </div>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <i class="fas fa-lock mr-1"></i> 現在のパスワード <span class="text-red-500">*</span>
        </label>
        <input type="password" id="password-current" required
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          placeholder="現在のパスワードを入力">
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <i class="fas fa-key mr-1"></i> 新しいパスワード <span class="text-red-500">*</span>
        </label>
        <input type="password" id="password-new" required minlength="6"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          placeholder="新しいパスワードを入力（6文字以上）">
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <i class="fas fa-check-circle mr-1"></i> 新しいパスワード（確認） <span class="text-red-500">*</span>
        </label>
        <input type="password" id="password-confirm" required minlength="6"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          placeholder="もう一度入力してください">
      </div>
      
      <div class="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onclick="document.getElementById('password-form').reset();" 
          class="px-6 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
          <i class="fas fa-times mr-2"></i>
          キャンセル
        </button>
        <button type="submit" 
          class="px-6 py-2 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90 transition">
          <i class="fas fa-shield-alt mr-2"></i>
          パスワードを変更
        </button>
      </div>
    </form>
  `;
}

// プロフィール更新処理
async function updateProfile() {
  try {
    // 基本情報
    const name = document.getElementById('profile-name')?.value;
    const email = document.getElementById('profile-email')?.value;
    const phone = document.getElementById('profile-phone')?.value;
    const gender = document.getElementById('profile-gender')?.value;
    
    // 身体情報（体重はhealth_logsで管理するため除外）
    const height = document.getElementById('body-height')?.value;
    const goal = document.getElementById('body-goal')?.value;
    
    const response = await apiCall('/api/auth/profile', {
      method: 'PUT',
      data: {
        name: name || currentUser.name,
        email: email || currentUser.email,
        phone: phone || currentUser.phone || null,
        gender: gender || currentUser.gender || null,
        height: height ? parseFloat(height) : currentUser.height || null,
        goal: goal || currentUser.goal || null,
      }
    });
    
    if (response.success) {
      currentUser = response.data;
      setUserData(currentUser);
      showToast('プロフィールを更新しました', 'success');
      await loadAllData();
      renderPage();
      // デフォルトタブを表示
      setTimeout(() => showSettingsTab('profile'), 100);
    }
  } catch (error) {
    showToast('更新に失敗しました', 'error');
  }
}

// パスワード変更処理
async function updatePassword() {
  try {
    const currentPassword = document.getElementById('password-current').value;
    const newPassword = document.getElementById('password-new').value;
    const confirmPassword = document.getElementById('password-confirm').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('すべての項目を入力してください', 'warning');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showToast('新しいパスワードが一致しません', 'warning');
      return;
    }
    
    if (newPassword.length < 6) {
      showToast('パスワードは6文字以上にしてください', 'warning');
      return;
    }
    
    const response = await apiCall('/api/auth/password', {
      method: 'PUT',
      data: {
        currentPassword,
        newPassword,
      }
    });
    
    if (response.success) {
      showToast('パスワードを変更しました', 'success');
      document.getElementById('password-form').reset();
    }
  } catch (error) {
    showToast('パスワード変更に失敗しました', 'error');
  }
}

// ヘルパー関数
function getAdviceTypeLabel(type) {
  const labels = { 
    meal: '食事', 
    exercise: '運動', 
    mental: 'メンタル', 
    sleep: '睡眠', 
    weight: '体重管理',
    diet: '食事',  // 後方互換性
    general: '全般' 
  };
  return labels[type] || type;
}

function getAdviceColor(type) {
  const colors = { 
    meal: 'success', 
    exercise: 'warning', 
    mental: 'info', 
    sleep: 'secondary', 
    weight: 'primary',
    diet: 'success',  // 後方互換性
    general: 'primary' 
  };
  return colors[type] || 'primary';
}

// フィルター機能（新機能）
let filteredLogs = healthLogs;

function filterHealthLogs() {
  const period = document.getElementById('log-filter-period').value;
  const exercise = document.getElementById('log-filter-exercise').value;
  const weight = document.getElementById('log-filter-weight').value;
  
  filteredLogs = healthLogs.filter(log => {
    // 期間フィルター
    if (period !== 'all') {
      const logDate = dayjs(log.log_date);
      const cutoffDate = dayjs().subtract(parseInt(period), 'day');
      if (logDate.isBefore(cutoffDate)) return false;
    }
    
    // 運動フィルター
    if (exercise === 'yes' && (!log.exercise_minutes || log.exercise_minutes === 0)) return false;
    if (exercise === 'no' && log.exercise_minutes && log.exercise_minutes > 0) return false;
    
    // 体重フィルター
    if (weight === 'yes' && !log.weight) return false;
    if (weight === 'no' && log.weight) return false;
    
    return true;
  });
  
  // 表示を更新
  updateLogTable();
  updateFilterCount();
}

function resetFilters() {
  document.getElementById('log-filter-period').value = '30';
  document.getElementById('log-filter-exercise').value = 'all';
  document.getElementById('log-filter-weight').value = 'all';
  filterHealthLogs();
}

function updateFilterCount() {
  const countSpan = document.getElementById('filtered-count');
  if (countSpan) {
    countSpan.textContent = filteredLogs.length;
  }
}

function updateLogTable() {
  // テーブルのtbodyを更新
  const tbody = document.querySelector('.table tbody');
  if (!tbody) return;
  
  tbody.innerHTML = filteredLogs.map(log => `
    <tr>
      <td class="sticky left-0 bg-white z-10 font-medium">${formatDate(log.log_date)}</td>
      <td>${log.weight ? log.weight + ' kg' : '--'}</td>
      <td>${log.body_fat_percentage ? log.body_fat_percentage + ' %' : '--'}</td>
      <td>${log.body_temperature ? log.body_temperature + ' ℃' : '--'}</td>
      <td>${log.sleep_hours ? log.sleep_hours + ' 時間' : '--'}</td>
      <td>${log.meal_calories ? log.meal_calories + ' kcal' : '--'}</td>
      <td>${log.exercise_minutes ? log.exercise_minutes + ' 分' : '--'}</td>
      <td class="max-w-xs truncate">${log.condition_note || '--'}</td>
      <td class="sticky right-0 bg-white z-10">
        <button onclick="editLog(${log.id})" class="text-blue-500 hover:underline text-xs mr-2">
          <i class="fas fa-edit"></i>
        </button>
        <button onclick="deleteLog(${log.id})" class="text-red-500 hover:underline text-xs">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// CSVエクスポート機能（新機能）
function exportHealthLogs() {
  if (healthLogs.length === 0) {
    showToast('エクスポートするデータがありません', 'warning');
    return;
  }
  
  // CSVヘッダー
  const headers = ['日付', '体重(kg)', '体脂肪率(%)', '体温(℃)', '睡眠(時間)', 'カロリー(kcal)', '運動(分)', '体調評価', 'メモ'];
  
  // CSVデータ行
  const rows = filteredLogs.map(log => [
    log.log_date,
    log.weight || '',
    log.body_fat_percentage || '',
    log.body_temperature || '',
    log.sleep_hours || '',
    log.meal_calories || '',
    log.exercise_minutes || '',
    log.condition_rating || '',
    (log.condition_note || '').replace(/,/g, '、')  // カンマをエスケープ
  ]);
  
  // CSV文字列生成
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  // BOM付きUTF-8でダウンロード
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `health_logs_${dayjs().format('YYYYMMDD')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast('CSVファイルをダウンロードしました', 'success');
}

// アドバイス詳細ポップアップ
function showAdviceDetail(adviceId) {
  const advice = advices.find(a => a.id === adviceId);
  if (!advice) return;
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  
  const isAI = advice.advice_source === 'ai';
  const iconColor = isAI ? 'from-blue-500 to-purple-500' : 'from-pink-500 to-rose-500';
  const icon = isAI ? 'fa-robot' : 'fa-user-nurse';
  
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
      <!-- ヘッダー -->
      <div class="bg-gradient-to-r ${iconColor} px-6 py-4 text-white">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <i class="fas ${icon} text-2xl"></i>
            </div>
            <div>
              <h3 class="text-lg font-bold">${isAI ? 'AIアドバイス' : 'スタッフアドバイス'}</h3>
              ${isAI && advice.confidence_score ? `
                <div class="flex items-center gap-2 mt-1">
                  <div class="w-20 h-1.5 bg-white bg-opacity-30 rounded-full overflow-hidden">
                    <div class="h-full bg-white" style="width: ${(advice.confidence_score * 100)}%"></div>
                  </div>
                  <span class="text-xs">信頼度 ${Math.round(advice.confidence_score * 100)}%</span>
                </div>
              ` : ''}
              ${!isAI ? `<div class="text-sm opacity-90">担当: ${advice.staff_name}</div>` : ''}
            </div>
          </div>
          <button onclick="this.closest('.fixed').remove()" class="w-8 h-8 flex items-center justify-center hover:bg-white hover:bg-opacity-20 rounded-full transition">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
      </div>
      
      <!-- コンテンツ -->
      <div class="p-6 overflow-y-auto" style="max-height: calc(80vh - 120px)">
        <div class="mb-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-${getAdviceColor(advice.advice_type)}-100 text-${getAdviceColor(advice.advice_type)}-700 rounded-full text-xs font-medium mb-2">
            <i class="fas fa-tag"></i>
            ${getAdviceTypeLabel(advice.advice_type)}
          </div>
          ${advice.log_date ? `
            <div class="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium mb-2 ml-2">
              <i class="fas fa-calendar"></i>
              ${advice.log_date}
            </div>
          ` : ''}
        </div>
        
        <h4 class="text-xl font-bold text-gray-800 mb-4">${advice.title}</h4>
        
        <div class="prose prose-sm max-w-none">
          <p class="text-gray-700 whitespace-pre-wrap leading-relaxed">${advice.content}</p>
        </div>
        
        ${isAI && advice.ai_analysis_data ? `
          <div class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h5 class="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
              <i class="fas fa-chart-line"></i>
              AI分析データ
            </h5>
            <pre class="text-xs text-blue-800 overflow-x-auto">${advice.ai_analysis_data}</pre>
          </div>
        ` : ''}
        
        <div class="mt-6 pt-4 border-t text-xs text-gray-500 flex items-center justify-between">
          <div>
            <i class="fas fa-clock mr-1"></i>
            ${formatRelativeTime(advice.created_at)}
          </div>
          ${!advice.is_read ? `
            <button onclick="markAdviceAsRead(${advice.id}); this.closest('.fixed').remove();" class="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-opacity-90 transition text-xs">
              既読にする
            </button>
          ` : `
            <span class="text-green-600">
              <i class="fas fa-check-circle mr-1"></i>
              既読
            </span>
          `}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// お知らせ詳細表示
function showAnnouncementDetail(id) {
  const announcement = announcements.find(a => a.id === id);
  if (!announcement) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-5 max-w-2xl">
      <div class="flex justify-between items-start mb-3">
        <h3 class="text-lg font-bold">${announcement.title}</h3>
        <button onclick="this.closest('.modal-backdrop').remove()" 
          class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      ${announcement.image_url ? `
        <img src="${announcement.image_url}" alt="${announcement.title}" 
          class="w-full max-h-64 object-cover rounded-lg mb-3">
      ` : ''}
      
      <p class="text-sm text-gray-700 whitespace-pre-wrap">${announcement.content}</p>
      
      <div class="mt-4 text-xs text-gray-500 text-right">
        ${formatDateTime(announcement.published_at)}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// 全てのお知らせを表示
function showAllAnnouncements() {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-5 max-w-3xl max-h-[80vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4 sticky top-0 bg-white pb-3 border-b">
        <h3 class="text-xl font-bold text-gray-800">
          <i class="fas fa-bullhorn mr-2 text-primary"></i>
          お知らせ一覧
        </h3>
        <button onclick="this.closest('.modal-backdrop').remove()" 
          class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <div class="space-y-3">
        ${announcements.length > 0 ? announcements.map(announcement => `
          <div class="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition cursor-pointer"
               onclick="showAnnouncementDetail(${announcement.id}); this.closest('.modal-backdrop').remove();">
            <div class="flex gap-3">
              ${announcement.image_url ? `
                <img src="${announcement.image_url}" alt="${announcement.title}" 
                  class="w-20 h-20 object-cover rounded flex-shrink-0">
              ` : ''}
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-2">
                  <i class="fas fa-bullhorn text-primary text-sm"></i>
                  <h4 class="text-base font-bold text-gray-800">${announcement.title}</h4>
                </div>
                <p class="text-sm text-gray-600 line-clamp-2 mb-2">${announcement.content}</p>
                <div class="text-xs text-gray-500">
                  <i class="fas fa-clock mr-1"></i>
                  ${formatDateTime(announcement.published_at)}
                </div>
              </div>
            </div>
          </div>
        `).join('') : `
          <div class="text-center py-8 text-gray-500">
            <i class="fas fa-inbox text-4xl mb-3"></i>
            <p>お知らせはありません</p>
          </div>
        `}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// =============================================================================
// 音声読み上げ機能（OpenAI TTS使用）
// =============================================================================

// 音声読み上げの状態管理
let currentAudio = null;
let isSpeaking = false;
let currentAdviceId = null;

// アドバイスを音声で読み上げ（OpenAI TTS API使用）
async function speakAdvice(adviceId, title, content) {
  const button = document.getElementById(`speak-btn-${adviceId}`);
  const icon = button?.querySelector('i');

  // 既に同じアドバイスを読み上げ中の場合は停止
  if (isSpeaking && currentAdviceId === adviceId) {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    isSpeaking = false;
    currentAdviceId = null;
    if (icon) {
      icon.className = icon.className.replace('fa-stop', 'fa-volume-up');
    }
    return;
  }

  // 他のアドバイスを読み上げ中の場合は停止
  if (isSpeaking && currentAudio) {
    currentAudio.pause();
    currentAudio = null;
    // 前のボタンのアイコンをリセット
    const prevButton = document.getElementById(`speak-btn-${currentAdviceId}`);
    const prevIcon = prevButton?.querySelector('i');
    if (prevIcon) {
      prevIcon.className = prevIcon.className.replace('fa-stop', 'fa-volume-up');
    }
  }

  // ローディング状態に設定
  isSpeaking = true;
  currentAdviceId = adviceId;
  if (icon) {
    icon.className = icon.className.replace('fa-volume-up', 'fa-spinner fa-spin');
  }

  try {
    // 読み上げるテキストを作成
    const textToSpeak = `${title}。${content}`;

    // OpenAI TTS APIを呼び出し（直接Fetch使用でストリーミング受信）
    const response = await fetch('/api/tts/speak', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: textToSpeak,
        voice: 'nova' // alloy, echo, fable, onyx, nova, shimmer
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '音声生成に失敗しました');
    }

    // 音声データをBlobとして取得
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // AudioオブジェクトでBlobを再生
    currentAudio = new Audio(audioUrl);

    // 再生開始時の処理
    currentAudio.onplay = () => {
      if (icon) {
        icon.className = icon.className.replace('fa-spinner fa-spin', 'fa-stop');
      }
    };

    // 再生終了時の処理
    currentAudio.onended = () => {
      isSpeaking = false;
      currentAdviceId = null;
      currentAudio = null;
      if (icon) {
        icon.className = icon.className.replace('fa-stop', 'fa-volume-up');
      }
    };

    // エラー時の処理
    currentAudio.onerror = (event) => {
      console.error('音声再生エラー:', event);
      isSpeaking = false;
      currentAdviceId = null;
      currentAudio = null;
      if (icon) {
        icon.className = icon.className.replace('fa-stop fa-spinner fa-spin', 'fa-volume-up');
      }
      showToast('音声再生に失敗しました', 'error');
    };

    // 再生開始
    await currentAudio.play();

  } catch (error) {
    console.error('TTS error:', error);
    isSpeaking = false;
    currentAdviceId = null;
    currentAudio = null;
    if (icon) {
      icon.className = icon.className.replace('fa-stop fa-spinner fa-spin', 'fa-volume-up');
    }
    showToast(error.message || '音声生成に失敗しました', 'error');
  }
}
