// トップページ - ファディー彦根

// 状態管理
let currentUser = null;
let currentAdvices = [];
let todayLog = null;
let announcements = [];
let latestStaffComment = null;
let selectedDate = null; // 選択された日付（YYYY-MM-DD形式）

// 食事記録データ
let mealData = {
  breakfast: { photos: [], calories: 0, protein: 0, fat: 0, carbs: 0 },
  lunch: { photos: [], calories: 0, protein: 0, fat: 0, carbs: 0 },
  dinner: { photos: [], calories: 0, protein: 0, fat: 0, carbs: 0 }
};

// ページ初期化
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await loadAnnouncements();
  renderPage();
  
  // 認証されている場合、アドバイスとログをロード
  if (currentUser) {
    selectedDate = dayjs().format('YYYY-MM-DD'); // 初期値は今日
    await loadAdvices();
    await loadLogForDate(selectedDate);
    await loadLatestStaffComment();
  }
});

// 認証チェック
async function checkAuth() {
  const token = getToken();
  if (!token) {
    currentUser = null;
    return;
  }
  
  try {
    const response = await axios.get('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.data.success) {
      currentUser = response.data.data;
      setUserData(currentUser);
    } else {
      removeToken();
      currentUser = null;
    }
  } catch (error) {
    removeToken();
    currentUser = null;
  }
}

// アドバイス読み込み
async function loadAdvices() {
  try {
    const response = await apiCall('/api/advices');
    if (response.success) {
      currentAdvices = response.data.slice(0, 3); // 最新3件
    }
  } catch (error) {
    console.error('アドバイスの読み込みに失敗:', error);
  }
}

// 指定日のログ読み込み
async function loadLogForDate(date) {
  try {
    const response = await apiCall('/api/health-logs');
    if (response.success) {
      const targetDate = date || dayjs().format('YYYY-MM-DD');
      todayLog = response.data.find(log => log.log_date === targetDate);
      
      // 食事データの復元
      if (todayLog?.meal_analysis) {
        try {
          const parsedMealData = JSON.parse(todayLog.meal_analysis);
          mealData = parsedMealData;
        } catch (e) {
          console.error('食事データのパースに失敗:', e);
        }
      } else {
        // データがない場合は初期化
        mealData = {
          breakfast: { photos: [], calories: 0, protein: 0, fat: 0, carbs: 0 },
          lunch: { photos: [], calories: 0, protein: 0, fat: 0, carbs: 0 },
          dinner: { photos: [], calories: 0, protein: 0, fat: 0, carbs: 0 }
        };
      }
      
      // ページを再レンダリング
      renderPage();
    }
  } catch (error) {
    console.error('ログの読み込みに失敗:', error);
  }
}

// ページレンダリング
function renderPage() {
  const root = document.getElementById('root');
  root.innerHTML = `
    ${renderHeader()}
    ${renderHero()}
    ${currentUser ? renderAdviceSection() : ''}
    ${currentUser ? renderHealthLogSection() : ''}
    ${renderQuickToolsSection()}
    ${renderFeaturesSection()}
    ${renderFAQSection()}
    ${renderGymIntroSection()}
    ${renderContactSection()}
    ${renderFooter()}
  `;
  
  // イベントリスナー設定
  setupEventListeners();
  
  // ダッシュボード更新
  if (currentUser) {
    updateDashboard();
  }
}

// 共通ヘッダー
function renderHeader() {
  return `
    <header class="bg-white shadow-sm sticky top-0 z-50">
      <div class="container mx-auto px-4 py-3">
        <div class="flex justify-between items-center">
          <a href="/" class="flex items-center gap-2">
            <i class="fas fa-dumbbell text-lg" style="color: var(--color-primary)"></i>
            <h1 class="text-lg font-bold" style="color: var(--color-primary)">ファディー彦根</h1>
          </a>
          
          <nav class="flex items-center gap-3">
            ${currentUser ? `
              <div class="flex items-center gap-3">
                <span class="hidden sm:flex items-center gap-2 text-sm text-gray-700">
                  <i class="fas fa-user-circle text-primary"></i>
                  <span class="font-medium">${currentUser.name}さん</span>
                </span>
                <a href="/mypage" class="px-3 py-2 text-sm text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition">
                  <i class="fas fa-chart-line mr-1"></i>
                  マイページ
                </a>
                <button onclick="logout()" class="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition">
                  ログアウト
                </button>
              </div>
            ` : `
              <button onclick="showLoginModal()" class="px-6 py-2 bg-primary text-white hover:bg-opacity-90 rounded-lg transition shadow-sm">
                <i class="fas fa-sign-in-alt mr-2"></i>
                <span>ログイン</span>
              </button>
            `}
          </nav>
        </div>
      </div>
    </header>
  `;
}

// Hero セクション
function renderHero() {
  return `
    <section class="gradient-bg text-white py-12">
      <div class="container mx-auto px-4">
        <div class="max-w-6xl mx-auto">
          <div class="text-center fade-in">
            ${currentUser ? `
              <h2 class="text-3xl md:text-4xl font-bold mb-3">
                こんにちは、${currentUser.name}さん
              </h2>
              <p class="text-lg mb-6 opacity-90">
                今日も健康的な1日を過ごしましょう！
              </p>
              <div class="flex justify-center gap-3">
                <a href="#health-log" onclick="document.getElementById('health-log-section').scrollIntoView({behavior: 'smooth'})" class="px-6 py-3 bg-white text-primary hover:bg-opacity-90 rounded-lg font-medium transition shadow-lg">
                  <i class="fas fa-edit mr-2"></i>健康ログ
                </a>
                <a href="/mypage" class="px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 border-2 border-white rounded-lg font-medium transition">
                  <i class="fas fa-chart-line mr-2"></i>詳細を見る
                </a>
              </div>
            ` : `
              <h2 class="text-4xl md:text-5xl font-bold mb-4">
                AIがサポートする<br>あなた専用の<br>パーソナルジム
              </h2>
              <p class="text-lg mb-6 opacity-90">
                体調・体重・食事を記録するだけで、<br class="hidden md:block">
                AIとプロのスタッフが<br class="hidden md:block">
                あなたに最適なアドバイスをお届けします
              </p>
              <button onclick="showLoginModal()" class="px-8 py-4 bg-white text-primary hover:bg-opacity-90 rounded-lg font-bold text-lg transition transform hover:scale-105 shadow-lg">
                今すぐ始める <i class="fas fa-arrow-right ml-2"></i>
              </button>
            `}
          </div>
          
          <!-- お知らせ（最新のみ表示） -->
          ${announcements.length > 0 ? `
            <div class="mt-8">
              <div class="space-y-2 mb-3">
                ${announcements.slice(0, 2).map(announcement => `
                  <div class="flex gap-2 items-start bg-white bg-opacity-10 backdrop-blur-sm p-2 rounded hover:bg-opacity-20 transition cursor-pointer"
                       onclick="showAnnouncementDetail(${announcement.id})">
                    ${announcement.image_url ? `
                      <img src="${announcement.image_url}" alt="${announcement.title}" 
                        class="w-10 h-10 object-cover rounded flex-shrink-0">
                    ` : ''}
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-0.5">
                        <i class="fas fa-bullhorn text-xs"></i>
                        <h4 class="text-xs font-bold truncate">${announcement.title}</h4>
                      </div>
                      <p class="text-xs opacity-90 line-clamp-1 leading-tight">${announcement.content}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
              <div class="text-center">
                <button onclick="showAllAnnouncements()" class="text-sm text-white hover:text-opacity-80 transition underline">
                  全て見る →
                </button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </section>
  `;
}

// アドバイスセクション
function renderAdviceSection() {
  if (!currentAdvices || currentAdvices.length === 0) {
    return '';
  }
  
  return `
    <section class="bg-white py-12">
      <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-comment-medical mr-2" style="color: var(--color-primary)"></i>
              スタッフからのアドバイス
            </h3>
            <a href="/mypage" class="text-primary hover:underline">すべて見る</a>
          </div>
          
          <div class="space-y-4">
            ${currentAdvices.map(advice => `
              <div class="card-hover bg-gray-50 p-6 rounded-lg border-l-4" style="border-color: var(--color-${getAdviceColor(advice.advice_type)})">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <span class="badge badge-${getAdviceColor(advice.advice_type)}">${getAdviceTypeLabel(advice.advice_type)}</span>
                    <h4 class="text-lg font-bold mt-2">${advice.title}</h4>
                  </div>
                  <span class="text-sm text-gray-500">${formatRelativeTime(advice.created_at)}</span>
                </div>
                <p class="text-gray-700 mb-3">${advice.content}</p>
                <div class="text-sm text-gray-600">
                  <i class="fas fa-user-nurse mr-1"></i>
                  ${advice.staff_name}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
}

// 健康ログ入力セクション
function renderHealthLogSection() {
  return `
    <section id="health-log-section" class="bg-gradient-to-b from-gray-50 to-white py-6">
      <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto">
          
          <!-- タイトルと日付選択 -->
          <div class="mb-4">
            <div class="text-center mb-3">
              <h3 class="text-xl font-bold text-gray-800">
                <i class="fas fa-edit mr-2" style="color: var(--color-primary)"></i>
                健康ログ
              </h3>
            </div>
            
            <!-- 日付選択 -->
            <div class="flex items-center justify-center gap-2">
              <button type="button" onclick="changeLogDate(-1)" class="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-primary hover:bg-white rounded-lg transition shadow-sm">
                <i class="fas fa-chevron-left"></i>
              </button>
              <div class="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm">
                <i class="fas fa-calendar-alt text-primary"></i>
                <input type="date" id="log-date-picker" value="${selectedDate || dayjs().format('YYYY-MM-DD')}" 
                  onchange="changeLogDateFromPicker(this.value)"
                  class="bg-transparent text-sm font-medium text-gray-700 border-none focus:outline-none cursor-pointer">
              </div>
              <button type="button" onclick="changeLogDate(1)" class="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-primary hover:bg-white rounded-lg transition shadow-sm">
                <i class="fas fa-chevron-right"></i>
              </button>
              <button type="button" onclick="goToToday()" class="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90 transition shadow-sm font-medium">
                今日
              </button>
            </div>
          </div>
          
          <!-- 今日の状況カード - 横1列 -->
          ${currentUser ? `
            <div class="mb-4 bg-white p-3 rounded-xl shadow-sm">
              <div class="grid grid-cols-4 gap-4">
                <!-- 総カロリー -->
                <div class="text-center">
                  <div class="flex items-center justify-center gap-2 mb-1">
                    <div class="w-8 h-8 bg-gradient-to-br from-primary to-pink-500 rounded-full flex items-center justify-center shadow-sm">
                      <i class="fas fa-fire text-white text-xs"></i>
                    </div>
                    <span class="text-xs font-medium text-gray-600">カロリー</span>
                  </div>
                  <div class="text-2xl font-bold text-gray-800" id="dashboard-calories">-</div>
                  <div class="text-xs text-gray-500 mt-0.5">目標: 2000kcal</div>
                </div>
                
                <!-- 運動時間 -->
                <div class="text-center border-l border-gray-200 pl-2">
                  <div class="flex items-center justify-center gap-2 mb-1">
                    <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-sm">
                      <i class="fas fa-running text-white text-xs"></i>
                    </div>
                    <span class="text-xs font-medium text-gray-600">運動</span>
                  </div>
                  <div class="text-2xl font-bold text-gray-800" id="dashboard-exercise">-</div>
                  <div class="text-xs text-gray-500 mt-0.5">目標: 30分</div>
                </div>
                
                <!-- 体重変化 -->
                <div class="text-center border-l border-gray-200 pl-2">
                  <div class="flex items-center justify-center gap-2 mb-1">
                    <div class="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                      <i class="fas fa-weight text-white text-xs"></i>
                    </div>
                    <span class="text-xs font-medium text-gray-600">体重</span>
                  </div>
                  <div class="text-2xl font-bold text-gray-800" id="dashboard-weight">-</div>
                  <div class="text-xs text-gray-500 mt-0.5" id="dashboard-weight-change">前回比: -</div>
                </div>
                
                <!-- 連続記録日数 -->
                <div class="text-center border-l border-gray-200 pl-2">
                  <div class="flex items-center justify-center gap-2 mb-1">
                    <div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-sm">
                      <i class="fas fa-trophy text-white text-xs"></i>
                    </div>
                    <span class="text-xs font-medium text-gray-600">連続記録</span>
                  </div>
                  <div class="text-2xl font-bold text-gray-800" id="dashboard-streak">-</div>
                  <div class="text-xs text-gray-500 mt-0.5">日連続達成中</div>
                </div>
              </div>
            </div>
          ` : ''}
          
          <!-- スタッフコメント -->
          ${latestStaffComment ? `
            <div class="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg shadow-sm">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-user-nurse text-white text-sm"></i>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-bold text-blue-700">スタッフからのコメント</span>
                    <span class="text-xs text-gray-500">${latestStaffComment.staff_name} • ${formatRelativeTime(latestStaffComment.created_at)}</span>
                  </div>
                  <p class="text-sm text-gray-700 leading-relaxed">${latestStaffComment.comment}</p>
                </div>
              </div>
            </div>
          ` : ''}
          
          <!-- 記録開始ボタン -->
          ${currentUser ? `
            <div class="mb-4 text-center">
              <button type="button" onclick="scrollToForm()" class="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-pink-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                <i class="fas fa-edit text-xl"></i>
                記録を始める
                <i class="fas fa-arrow-down text-sm animate-bounce"></i>
              </button>
            </div>
          ` : ''}
            
          <!-- 入力フォーム -->
          <form id="health-log-form" class="space-y-3">
            <!-- 体重と体調（横並び） -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <!-- 体重 & BMI -->
              <div class="bg-white p-3 rounded-lg shadow-sm">
                <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                  <i class="fas fa-weight text-primary"></i>
                  体重 & BMI
                </label>
                <div class="flex items-center gap-2">
                  <div class="relative flex-1">
                    <input type="number" step="0.1" name="weight" id="weight-input" value="${todayLog?.weight || ''}" 
                      placeholder="65.5"
                      oninput="updateBMIDisplay()"
                      class="w-full px-4 py-2.5 text-xl font-bold bg-gray-50 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition">
                    <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">kg</span>
                  </div>
                  <div class="text-center px-3 py-2 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg min-w-[80px]">
                    <div class="text-xs text-gray-600 mb-0.5">BMI</div>
                    <div class="text-lg font-bold" id="bmi-display">-</div>
                  </div>
                </div>
              </div>
              
              <!-- 体調 -->
              <div class="bg-white p-3 rounded-lg shadow-sm">
                <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                  <i class="fas fa-smile text-primary"></i>
                  今日の体調
                </label>
                <div class="flex items-center justify-between gap-1">
                  ${[1, 2, 3, 4, 5].map(rating => {
                    const icons = ['fa-tired', 'fa-frown', 'fa-meh', 'fa-smile', 'fa-grin-stars'];
                    const colors = ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-green-500', 'text-blue-500'];
                    const labels = ['悪', '微', '普', '良', '最'];
                    const isSelected = (todayLog?.condition_rating || 3) === rating;
                    
                    return `
                      <label class="flex-1 cursor-pointer" onclick="selectConditionRating(${rating})">
                        <input type="radio" name="condition_rating" value="${rating}" 
                          ${isSelected ? 'checked' : ''}
                          class="hidden" id="condition-rating-${rating}">
                        <div class="flex flex-col items-center p-2 rounded-lg transition ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'}" id="condition-rating-label-${rating}">
                          <i class="fas ${icons[rating-1]} text-2xl ${isSelected ? colors[rating-1] : 'text-gray-300'} mb-1" id="condition-rating-icon-${rating}"></i>
                          <span class="text-xs ${isSelected ? 'text-gray-700 font-bold' : 'text-gray-400'}" id="condition-rating-text-${rating}">${labels[rating-1]}</span>
                        </div>
                      </label>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
            
            <!-- 食事記録 -->
            <div class="bg-white p-3 rounded-lg shadow-sm">
              <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                <i class="fas fa-utensils text-accent"></i>
                食事記録
              </label>
              
              <!-- 3食 -->
              <div class="space-y-2">
                <!-- 朝食 -->
                <div class="bg-gradient-to-br from-yellow-50 to-orange-50 p-2 rounded-lg">
                  <!-- タイトル・カロリー・撮影ボタンを1行に -->
                  <div class="flex items-center gap-2 mb-1">
                    <div class="text-xs font-bold text-gray-700 whitespace-nowrap">
                      <i class="fas fa-sun text-yellow-500"></i> 朝食
                    </div>
                    <input type="number" id="breakfast-calories" value="${mealData?.breakfast?.calories || 0}"
                      oninput="updateMealNutrition('breakfast', 'calories', this.value)"
                      placeholder="0"
                      class="flex-1 px-2 py-1 bg-white text-gray-800 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 text-center text-sm font-bold min-w-0">
                    <span class="text-xs text-gray-500 whitespace-nowrap">kcal</span>
                    <button type="button" onclick="showMealModal('breakfast')" 
                      class="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 transition whitespace-nowrap flex-shrink-0">
                      <i class="fas fa-camera"></i>
                    </button>
                  </div>
                  
                  <!-- PFC入力 (折りたたみ) -->
                  <button type="button" onclick="toggleMealPFC('breakfast')" 
                    class="w-full text-xs text-gray-600 hover:text-gray-800 flex items-center justify-center gap-1 py-0.5">
                    <i class="fas fa-plus-circle text-xs"></i>
                    <span>PFC</span>
                    <i class="fas fa-chevron-down text-xs" id="breakfast-pfc-arrow"></i>
                  </button>
                  
                  <div id="breakfast-pfc" class="hidden grid grid-cols-3 gap-1 mt-1">
                    <div>
                      <input type="number" step="0.1" id="breakfast-protein" value="${mealData?.breakfast?.protein || 0}"
                        oninput="updateMealNutrition('breakfast', 'protein', this.value)"
                        placeholder="P"
                        class="w-full px-2 py-1 bg-white text-gray-800 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-orange-500">
                      <div class="text-xs text-gray-500 text-center mt-0.5">P(g)</div>
                    </div>
                    <div>
                      <input type="number" step="0.1" id="breakfast-fat" value="${mealData?.breakfast?.fat || 0}"
                        oninput="updateMealNutrition('breakfast', 'fat', this.value)"
                        placeholder="F"
                        class="w-full px-2 py-1 bg-white text-gray-800 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-orange-500">
                      <div class="text-xs text-gray-500 text-center mt-0.5">F(g)</div>
                    </div>
                    <div>
                      <input type="number" step="0.1" id="breakfast-carbs" value="${mealData?.breakfast?.carbs || 0}"
                        oninput="updateMealNutrition('breakfast', 'carbs', this.value)"
                        placeholder="C"
                        class="w-full px-2 py-1 bg-white text-gray-800 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-orange-500">
                      <div class="text-xs text-gray-500 text-center mt-0.5">C(g)</div>
                    </div>
                  </div>
                  
                  <div id="breakfast-photos" class="mt-1 text-xs text-gray-600 text-center"></div>
                </div>
                
                <!-- 昼食 -->
                <div class="bg-gradient-to-br from-orange-50 to-red-50 p-2 rounded-lg">
                  <!-- タイトル・カロリー・撮影ボタンを1行に -->
                  <div class="flex items-center gap-2 mb-1">
                    <div class="text-xs font-bold text-gray-700 whitespace-nowrap">
                      <i class="fas fa-cloud-sun text-orange-500"></i> 昼食
                    </div>
                    <input type="number" id="lunch-calories" value="${mealData?.lunch?.calories || 0}"
                      oninput="updateMealNutrition('lunch', 'calories', this.value)"
                      placeholder="0"
                      class="flex-1 px-2 py-1 bg-white text-gray-800 rounded focus:outline-none focus:ring-1 focus:ring-red-500 text-center text-sm font-bold min-w-0">
                    <span class="text-xs text-gray-500 whitespace-nowrap">kcal</span>
                    <button type="button" onclick="showMealModal('lunch')" 
                      class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition whitespace-nowrap flex-shrink-0">
                      <i class="fas fa-camera"></i>
                    </button>
                  </div>
                  
                  <!-- PFC入力 (折りたたみ) -->
                  <button type="button" onclick="toggleMealPFC('lunch')" 
                    class="w-full text-xs text-gray-600 hover:text-gray-800 flex items-center justify-center gap-1 py-0.5">
                    <i class="fas fa-plus-circle text-xs"></i>
                    <span>PFC</span>
                    <i class="fas fa-chevron-down text-xs" id="lunch-pfc-arrow"></i>
                  </button>
                  
                  <div id="lunch-pfc" class="hidden grid grid-cols-3 gap-1 mt-1">
                    <div>
                      <input type="number" step="0.1" id="lunch-protein" value="${mealData?.lunch?.protein || 0}"
                        oninput="updateMealNutrition('lunch', 'protein', this.value)"
                        placeholder="P"
                        class="w-full px-2 py-1 bg-white text-gray-800 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-red-500">
                      <div class="text-xs text-gray-500 text-center mt-0.5">P(g)</div>
                    </div>
                    <div>
                      <input type="number" step="0.1" id="lunch-fat" value="${mealData?.lunch?.fat || 0}"
                        oninput="updateMealNutrition('lunch', 'fat', this.value)"
                        placeholder="F"
                        class="w-full px-2 py-1 bg-white text-gray-800 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-red-500">
                      <div class="text-xs text-gray-500 text-center mt-0.5">F(g)</div>
                    </div>
                    <div>
                      <input type="number" step="0.1" id="lunch-carbs" value="${mealData?.lunch?.carbs || 0}"
                        oninput="updateMealNutrition('lunch', 'carbs', this.value)"
                        placeholder="C"
                        class="w-full px-2 py-1 bg-white text-gray-800 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-red-500">
                      <div class="text-xs text-gray-500 text-center mt-0.5">C(g)</div>
                    </div>
                  </div>
                  
                  <div id="lunch-photos" class="mt-1 text-xs text-gray-600 text-center"></div>
                </div>
                
                <!-- 夕食 -->
                <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-2 rounded-lg">
                  <!-- タイトル・カロリー・撮影ボタンを1行に -->
                  <div class="flex items-center gap-2 mb-1">
                    <div class="text-xs font-bold text-gray-700 whitespace-nowrap">
                      <i class="fas fa-moon text-blue-500"></i> 夕食
                    </div>
                    <input type="number" id="dinner-calories" value="${mealData?.dinner?.calories || 0}"
                      oninput="updateMealNutrition('dinner', 'calories', this.value)"
                      placeholder="0"
                      class="flex-1 px-2 py-1 bg-white text-gray-800 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center text-sm font-bold min-w-0">
                    <span class="text-xs text-gray-500 whitespace-nowrap">kcal</span>
                    <button type="button" onclick="showMealModal('dinner')" 
                      class="px-2 py-1 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600 transition whitespace-nowrap flex-shrink-0">
                      <i class="fas fa-camera"></i>
                    </button>
                  </div>
                  
                  <!-- PFC入力 (折りたたみ) -->
                  <button type="button" onclick="toggleMealPFC('dinner')" 
                    class="w-full text-xs text-gray-600 hover:text-gray-800 flex items-center justify-center gap-1 py-0.5">
                    <i class="fas fa-plus-circle text-xs"></i>
                    <span>PFC</span>
                    <i class="fas fa-chevron-down text-xs" id="dinner-pfc-arrow"></i>
                  </button>
                  
                  <div id="dinner-pfc" class="hidden grid grid-cols-3 gap-1 mt-1">
                    <div>
                      <input type="number" step="0.1" id="dinner-protein" value="${mealData?.dinner?.protein || 0}"
                        oninput="updateMealNutrition('dinner', 'protein', this.value)"
                        placeholder="P"
                        class="w-full px-2 py-1 bg-white text-gray-800 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      <div class="text-xs text-gray-500 text-center mt-0.5">P(g)</div>
                    </div>
                    <div>
                      <input type="number" step="0.1" id="dinner-fat" value="${mealData?.dinner?.fat || 0}"
                        oninput="updateMealNutrition('dinner', 'fat', this.value)"
                        placeholder="F"
                        class="w-full px-2 py-1 bg-white text-gray-800 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      <div class="text-xs text-gray-500 text-center mt-0.5">F(g)</div>
                    </div>
                    <div>
                      <input type="number" step="0.1" id="dinner-carbs" value="${mealData?.dinner?.carbs || 0}"
                        oninput="updateMealNutrition('dinner', 'carbs', this.value)"
                        placeholder="C"
                        class="w-full px-2 py-1 bg-white text-gray-800 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      <div class="text-xs text-gray-500 text-center mt-0.5">C(g)</div>
                    </div>
                  </div>
                  
                  <div id="dinner-photos" class="mt-1 text-xs text-gray-600 text-center"></div>
                </div>
              </div>
                
              <!-- 合計 -->
              <div class="mt-3 bg-gradient-to-br from-primary/10 to-pink-50 p-2.5 rounded-lg">
                <div class="text-center">
                  <div class="text-xs text-gray-600 mb-1">今日の総カロリー</div>
                  <div class="flex items-center justify-center gap-2">
                    <input type="number" 
                      id="total-calories-input"
                      value="0"
                      oninput="updateTotalCaloriesDisplay()"
                      class="w-24 px-2 py-1 text-xl font-bold text-primary text-center bg-white rounded focus:outline-none focus:ring-2 focus:ring-primary">
                    <span class="text-sm text-gray-500">kcal</span>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    <span id="total-calories-breakdown">朝0 + 昼0 + 夕0</span>
                  </div>
                </div>
              </div>
              
            </div>
            
            <!-- 隠しフィールド（詳細記録用） -->
            <input type="hidden" name="body_fat_percentage" id="body-fat-hidden" value="${todayLog?.body_fat_percentage || ''}">
            <input type="hidden" name="sleep_hours" id="sleep-hours-hidden" value="${todayLog?.sleep_hours || ''}">
            <input type="hidden" name="exercise_minutes" id="exercise-minutes-hidden" value="${todayLog?.exercise_minutes || ''}">
            <input type="hidden" name="condition_note" id="condition-note-hidden" value="${todayLog?.condition_note || ''}">
            
            <!-- 保存ボタン -->
            <button type="submit" class="w-full btn-primary px-5 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition">
              <i class="fas fa-save mr-2"></i>
              記録を保存
            </button>
          </form>
          
          <!-- 運動トラッカー（フォーム外・独立） -->
          <div class="mt-4">
            <div class="bg-white p-3 rounded-lg shadow-sm">
              <button type="button" onclick="toggleExerciseTracker()" 
                class="w-full flex items-center justify-between text-left group">
                <label class="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                  <i class="fas fa-running text-primary group-hover:text-pink-500 transition"></i>
                  運動トラッカー
                </label>
                <i class="fas fa-chevron-down text-gray-400 transform transition-transform text-sm" id="exercise-tracker-arrow"></i>
              </button>
                
              <div id="exercise-tracker" class="hidden mt-4">
                <!-- 運動サマリー -->
                  <div class="grid grid-cols-2 gap-2 mb-3">
                    <div class="bg-blue-50 p-2 rounded-lg text-center">
                      <div class="text-xs text-gray-600 mb-0.5">合計時間</div>
                      <div class="text-lg font-bold text-blue-600" id="total-exercise-time">0</div>
                      <div class="text-xs text-gray-500">分</div>
                    </div>
                    <div class="bg-orange-50 p-2 rounded-lg text-center">
                      <div class="text-xs text-gray-600 mb-0.5">消費カロリー</div>
                      <div class="text-lg font-bold text-orange-600" id="total-exercise-calories">0</div>
                      <div class="text-xs text-gray-500">kcal</div>
                    </div>
                  </div>
                  
                  <!-- 運動種目リスト -->
                  <div class="space-y-1.5">
                    ${[
                      { id: 'furdi', name: 'ファディー', icon: 'fa-dumbbell', met: 5, color: 'pink', time: 30 },
                      { id: 'weight-training', name: '筋トレ', icon: 'fa-dumbbell', met: 6, color: 'blue', time: 30 },
                      { id: 'running', name: 'ランニング', icon: 'fa-running', met: 8, color: 'green', time: 30 },
                      { id: 'jogging', name: 'ジョギング', icon: 'fa-shoe-prints', met: 5, color: 'teal', time: 20 },
                      { id: 'walking', name: 'ウォーキング', icon: 'fa-walking', met: 3, color: 'cyan', time: 30 },
                      { id: 'cycling', name: 'サイクリング', icon: 'fa-bicycle', met: 6, color: 'indigo', time: 30 },
                      { id: 'swimming', name: '水泳', icon: 'fa-swimmer', met: 8, color: 'blue', time: 30 },
                      { id: 'yoga', name: 'ヨガ', icon: 'fa-om', met: 3, color: 'purple', time: 30 },
                      { id: 'pilates', name: 'ピラティス', icon: 'fa-spa', met: 4, color: 'pink', time: 30 },
                      { id: 'stretch', name: 'ストレッチ', icon: 'fa-child', met: 2.5, color: 'purple', time: 15 },
                      { id: 'hiit', name: 'HIIT', icon: 'fa-fire', met: 10, color: 'red', time: 20 },
                      { id: 'dance', name: 'ダンス', icon: 'fa-music', met: 5, color: 'pink', time: 30 },
                      { id: 'boxing', name: 'ボクシング', icon: 'fa-hand-rock', met: 9, color: 'red', time: 30 }
                    ].map(ex => `
                      <div class="flex items-center gap-2 bg-white p-2 rounded-lg hover:bg-gray-50 transition">
                        <button type="button" 
                          onclick="toggleExercise('${ex.id}')"
                          id="exercise-toggle-${ex.id}"
                          class="w-12 h-8 bg-gray-200 rounded-full relative transition-all duration-300 flex-shrink-0"
                          data-active="false">
                          <div class="absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow transition-all duration-300"></div>
                        </button>
                        <i class="fas ${ex.icon} text-${ex.color}-500 text-sm flex-shrink-0"></i>
                        <span class="text-xs font-medium text-gray-700 flex-1 min-w-0">${ex.name}</span>
                        <input type="number" 
                          id="exercise-time-${ex.id}"
                          value="${ex.time}"
                          onchange="updateExerciseSummary()"
                          class="w-12 px-1 py-0.5 text-xs text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary">
                        <span class="text-xs text-gray-500 whitespace-nowrap">分</span>
                        <span class="text-xs text-gray-400 whitespace-nowrap" id="exercise-cal-${ex.id}">0kcal</span>
                      </div>
                    `).join('')}
                  </div>
                  
                  <!-- 運動メモ -->
                  <div class="mt-3">
                    <label class="flex items-center gap-1 text-xs font-medium text-gray-600 mb-2">
                      <i class="fas fa-pencil-alt text-primary"></i>
                      運動メモ
                    </label>
                    <textarea id="condition-note-input" rows="2" 
                      placeholder="例：ジムでベンチプレス60kg × 10回 × 3セット"
                      oninput="syncHiddenField('condition-note-input', 'condition-note-hidden')"
                      class="w-full px-3 py-2 text-sm bg-gray-50 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
                    >${todayLog?.condition_note || ''}</textarea>
                  </div>
              </div>
            </div>
            
            <!-- 詳細記録 & 便利ツール（折りたたみ） -->
            <div class="bg-white p-3 rounded-lg shadow-sm">
              <button type="button" onclick="toggleDetailedInputs()" 
                class="w-full flex items-center justify-between text-left group">
                <label class="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                  <i class="fas fa-clipboard-list text-primary group-hover:text-pink-500 transition"></i>
                  詳細記録 & 便利ツール
                </label>
                <i class="fas fa-chevron-down text-gray-400 transform transition-transform text-sm" id="detailed-inputs-arrow"></i>
              </button>
              
              <div id="detailed-inputs" class="hidden mt-4 space-y-6">
                <!-- その他の記録 -->
                <div class="pb-4 border-b border-gray-200">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <!-- 体脂肪率 -->
                    <div>
                      <label class="flex items-center gap-1 text-xs font-medium text-gray-600 mb-2">
                        <i class="fas fa-percentage text-primary"></i>
                        体脂肪率
                      </label>
                      <div class="relative">
                        <input type="number" step="0.1" id="body-fat-input" value="${todayLog?.body_fat_percentage || ''}"
                          placeholder="25.0"
                          oninput="syncHiddenField('body-fat-input', 'body-fat-hidden')"
                          class="w-full px-3 py-2 text-sm bg-gray-50 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition">
                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">%</span>
                      </div>
                    </div>
                    
                    <!-- 睡眠 -->
                    <div>
                      <label class="flex items-center gap-1 text-xs font-medium text-gray-600 mb-2">
                        <i class="fas fa-bed text-primary"></i>
                        睡眠時間
                      </label>
                      <div class="relative">
                        <input type="number" step="0.5" id="sleep-hours-input" value="${todayLog?.sleep_hours || ''}"
                          placeholder="7.5"
                          oninput="syncHiddenField('sleep-hours-input', 'sleep-hours-hidden')"
                          class="w-full px-3 py-2 text-sm bg-gray-50 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition">
                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">時間</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- 便利ツール -->
                <div>
                  <h4 class="text-xs font-bold text-gray-600 mb-3 flex items-center gap-1">
                    <i class="fas fa-magic text-primary"></i>
                    便利ツール
                  </h4>
                  
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <!-- クイック運動記録 -->
                    <div class="bg-gradient-to-br from-blue-50 to-cyan-50 p-3 rounded-lg">
                      <h5 class="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1">
                        <i class="fas fa-running text-blue-500"></i>
                        クイック運動
                      </h5>
                      <div class="space-y-1.5">
                        <button type="button" onclick="quickExercise('ファディー', 30)" class="w-full text-left px-2 py-1.5 bg-white hover:bg-pink-50 rounded transition text-xs flex items-center justify-between">
                          <span><i class="fas fa-dumbbell mr-1 text-pink-600"></i>ファディー</span>
                          <span class="text-gray-500">30分</span>
                        </button>
                        <button type="button" onclick="quickExercise('筋トレ', 30)" class="w-full text-left px-2 py-1.5 bg-white hover:bg-blue-50 rounded transition text-xs flex items-center justify-between">
                          <span><i class="fas fa-dumbbell mr-1 text-blue-600"></i>筋トレ</span>
                          <span class="text-gray-500">30分</span>
                        </button>
                        <button type="button" onclick="quickExercise('ストレッチ', 15)" class="w-full text-left px-2 py-1.5 bg-white hover:bg-purple-50 rounded transition text-xs flex items-center justify-between">
                          <span><i class="fas fa-child mr-1 text-purple-600"></i>ストレッチ</span>
                          <span class="text-gray-500">15分</span>
                        </button>
                        <button type="button" onclick="quickExercise('ジョギング', 20)" class="w-full text-left px-2 py-1.5 bg-white hover:bg-green-50 rounded transition text-xs flex items-center justify-between">
                          <span><i class="fas fa-shoe-prints mr-1 text-green-600"></i>ジョギング</span>
                          <span class="text-gray-500">20分</span>
                        </button>
                        <button type="button" onclick="quickExercise('ヨガ', 25)" class="w-full text-left px-2 py-1.5 bg-white hover:bg-indigo-50 rounded transition text-xs flex items-center justify-between">
                          <span><i class="fas fa-om mr-1 text-indigo-600"></i>ヨガ</span>
                          <span class="text-gray-500">25分</span>
                        </button>
                      </div>
                    </div>
                    
                    <!-- カロリー計算機 -->
                    <div class="bg-gradient-to-br from-orange-50 to-yellow-50 p-3 rounded-lg">
                      <h5 class="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1">
                        <i class="fas fa-calculator text-orange-500"></i>
                        カロリー計算
                      </h5>
                      <div class="space-y-2">
                        <div>
                          <label class="text-xs text-gray-600 block mb-1">運動時間</label>
                          <input type="number" id="calc-minutes" value="30" 
                            class="w-full px-2 py-1 text-xs border border-orange-200 rounded focus:outline-none focus:ring-1 focus:ring-primary">
                        </div>
                        <div>
                          <label class="text-xs text-gray-600 block mb-1">運動強度</label>
                          <select id="calc-intensity" 
                            class="w-full px-2 py-1 text-xs border border-orange-200 rounded focus:outline-none focus:ring-1 focus:ring-primary">
                            <option value="3">軽い (3 MET)</option>
                            <option value="5" selected>普通 (5 MET)</option>
                            <option value="7">激しい (7 MET)</option>
                            <option value="10">非常に激しい (10 MET)</option>
                          </select>
                        </div>
                        <button type="button" onclick="calculateCalories()" 
                          class="w-full px-2 py-1.5 bg-orange-500 text-white rounded hover:bg-orange-600 transition text-xs font-medium">
                          <i class="fas fa-fire mr-1"></i>計算
                        </button>
                        <div id="calorie-result" class="text-center text-xs font-bold text-orange-600"></div>
                      </div>
                    </div>
                    
                    <!-- 今週の目標 -->
                    <div class="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg">
                      <h5 class="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1">
                        <i class="fas fa-bullseye text-green-500"></i>
                        今週の目標
                      </h5>
                      <div class="space-y-2">
                        <div class="bg-white p-2 rounded">
                          <div class="flex items-center justify-between mb-1">
                            <span class="text-xs text-gray-600">運動</span>
                            <span class="text-xs font-bold text-green-600">4/7日</span>
                          </div>
                          <div class="w-full bg-gray-200 rounded-full h-1.5">
                            <div class="bg-green-500 h-full rounded-full" style="width: 57%"></div>
                          </div>
                        </div>
                        <div class="bg-white p-2 rounded">
                          <div class="flex items-center justify-between mb-1">
                            <span class="text-xs text-gray-600">体重記録</span>
                            <span class="text-xs font-bold text-green-600">5/7日</span>
                          </div>
                          <div class="w-full bg-gray-200 rounded-full h-1.5">
                            <div class="bg-green-500 h-full rounded-full" style="width: 71%"></div>
                          </div>
                        </div>
                        <button type="button" onclick="openGoalSettings()" 
                          class="w-full px-2 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition text-xs font-medium">
                          <i class="fas fa-cog mr-1"></i>目標を変更
                        </button>
                      </div>
                    </div>
                    
                    <!-- BMI計算機 -->
                    <div class="bg-gradient-to-br from-purple-50 to-pink-50 p-3 rounded-lg">
                      <h5 class="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1">
                        <i class="fas fa-chart-line text-purple-500"></i>
                        BMI計算
                      </h5>
                      <div class="space-y-2">
                        <div>
                          <label class="text-xs text-gray-600 block mb-1">身長 (cm)</label>
                          <input type="number" id="bmi-height" value="${currentUser?.height || ''}" 
                            class="w-full px-2 py-1 text-xs border border-purple-200 rounded focus:outline-none focus:ring-1 focus:ring-primary">
                        </div>
                        <div>
                          <label class="text-xs text-gray-600 block mb-1">体重 (kg)</label>
                          <input type="number" id="bmi-weight" value="${todayLog?.weight || ''}" step="0.1"
                            class="w-full px-2 py-1 text-xs border border-purple-200 rounded focus:outline-none focus:ring-1 focus:ring-primary">
                        </div>
                        <button type="button" onclick="calculateBMI()" 
                          class="w-full px-2 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 transition text-xs font-medium">
                          <i class="fas fa-calculator mr-1"></i>計算
                        </button>
                        <div id="bmi-result" class="text-center text-xs font-bold text-purple-600"></div>
                      </div>
                    </div>
                    
                    <!-- PFC目標計算 -->
                    <div class="bg-gradient-to-br from-indigo-50 to-blue-50 p-3 rounded-lg">
                      <h5 class="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1">
                        <i class="fas fa-balance-scale text-indigo-500"></i>
                        PFC目標計算
                      </h5>
                      <div class="space-y-2">
                        <div>
                          <label class="text-xs text-gray-600 block mb-1">目標カロリー</label>
                          <input type="number" id="target-calories" value="2000" 
                            class="w-full px-2 py-1 text-xs border border-indigo-200 rounded focus:outline-none focus:ring-1 focus:ring-primary">
                        </div>
                        <div>
                          <label class="text-xs text-gray-600 block mb-1">目標タイプ</label>
                          <select id="pfc-goal-type" 
                            class="w-full px-2 py-1 text-xs border border-indigo-200 rounded focus:outline-none focus:ring-1 focus:ring-primary">
                            <option value="maintain">維持 (P:30% F:25% C:45%)</option>
                            <option value="lose">減量 (P:35% F:20% C:45%)</option>
                            <option value="gain">増量 (P:30% F:30% C:40%)</option>
                          </select>
                        </div>
                        <button type="button" onclick="calculatePFCGoal()" 
                          class="w-full px-2 py-1.5 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition text-xs font-medium">
                          <i class="fas fa-chart-pie mr-1"></i>計算
                        </button>
                        <div id="pfc-result" class="text-xs text-gray-700"></div>
                      </div>
                    </div>
                    
                    <!-- 水分補給リマインダー -->
                    <div class="bg-gradient-to-br from-cyan-50 to-teal-50 p-3 rounded-lg">
                      <h5 class="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1">
                        <i class="fas fa-tint text-cyan-500"></i>
                        水分補給
                      </h5>
                      <div class="space-y-2">
                        <div class="bg-white p-2 rounded">
                          <div class="text-xs text-gray-600 mb-1">今日の水分</div>
                          <div class="flex items-center justify-between">
                            <span class="text-lg font-bold text-cyan-600" id="water-intake">0</span>
                            <span class="text-xs text-gray-500">/ 2000 ml</span>
                          </div>
                          <div class="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div id="water-progress" class="bg-cyan-500 h-full rounded-full" style="width: 0%"></div>
                          </div>
                        </div>
                        <div class="grid grid-cols-2 gap-1">
                          <button type="button" onclick="addWater(200)" 
                            class="px-2 py-1.5 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition text-xs">
                            +200ml
                          </button>
                          <button type="button" onclick="addWater(500)" 
                            class="px-2 py-1.5 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition text-xs">
                            +500ml
                          </button>
                        </div>
                        <button type="button" onclick="resetWater()" 
                          class="w-full px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition text-xs">
                          <i class="fas fa-redo mr-1"></i>リセット
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          </div>
          
          <!-- 質問・相談 -->
          <div class="mt-4 bg-gradient-to-br from-purple-50 to-pink-50 p-3 rounded-lg shadow-sm">
            <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <i class="fas fa-comments text-primary"></i>
              質問・相談
            </label>
            
            <textarea 
              id="question-input" 
              rows="2" 
              class="w-full px-3 py-2 text-sm bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition mb-2"
              placeholder="トレーニングや食事に関する質問をどうぞ..."
            ></textarea>
            
            <div class="flex items-center justify-between">
              <a href="/mypage#qa-section" class="text-xs text-primary hover:underline">
                <i class="fas fa-history mr-1"></i>
                過去の質問
              </a>
              <button 
                onclick="submitQuestion()" 
                class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90 transition shadow-sm font-medium"
              >
                <i class="fas fa-paper-plane mr-1"></i>
                送信
              </button>
            </div>
          </div>
          
          <!-- マイページリンク -->
          <div class="mt-3 text-center">
            <a href="/mypage" class="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium">
              <i class="fas fa-chart-line"></i>
              マイページで詳しい分析を見る
              <i class="fas fa-arrow-right text-xs"></i>
            </a>
          </div>
        </div>
      </div>
    </section>
  `;
  
  // レンダリング後にBMI更新
  setTimeout(() => updateBMIDisplay(), 100);
}

// 便利機能ウィジェット（新機能）
// Note: この関数は廃止されました。便利ツールは詳細記録セクション内に統合されています。
function renderQuickToolsSection() {
  return ''; // 便利ツールは詳細記録の折りたたみセクション内に移動
}

// 特徴セクション
function renderFeaturesSection() {
  return `
    <section id="features" class="bg-white py-16">
      <div class="container mx-auto px-4">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-3xl font-bold text-center mb-4">ファディーの特徴</h2>
          <p class="text-center text-gray-600 mb-12">最新のAI技術とプロのトレーナーが、あなたの健康目標達成を強力にサポート</p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- AI食事解析 -->
            <div class="card-hover p-6 bg-gradient-to-br from-pink-50 to-white rounded-lg border border-pink-100">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-robot text-2xl" style="color: var(--color-primary)"></i>
                </div>
                <h3 class="text-lg font-bold">AI食事解析</h3>
              </div>
              <ul class="space-y-2 text-sm text-gray-700">
                <li><i class="fas fa-check text-green-500 mr-2"></i>写真1枚で自動カロリー計算</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>PFC（タンパク質・脂質・炭水化物）バランス解析</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>朝・昼・晩の食事パターン分析</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>栄養不足の自動検出とアラート</li>
              </ul>
            </div>
            
            <!-- プロのアドバイス -->
            <div class="card-hover p-6 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-100">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-12 h-12 bg-blue-500 bg-opacity-10 rounded-full flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-user-nurse text-2xl text-blue-500"></i>
                </div>
                <h3 class="text-lg font-bold">プロのアドバイス</h3>
              </div>
              <ul class="space-y-2 text-sm text-gray-700">
                <li><i class="fas fa-check text-green-500 mr-2"></i>国家資格保持トレーナーが個別対応</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>週1回の詳細フィードバック</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>運動メニューのカスタマイズ提案</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>目標達成までの具体的ロードマップ作成</li>
              </ul>
            </div>
            
            <!-- 詳細な分析 -->
            <div class="card-hover p-6 bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-100">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-12 h-12 bg-green-500 bg-opacity-10 rounded-full flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-chart-line text-2xl text-green-500"></i>
                </div>
                <h3 class="text-lg font-bold">詳細な分析</h3>
              </div>
              <ul class="space-y-2 text-sm text-gray-700">
                <li><i class="fas fa-check text-green-500 mr-2"></i>体重・体脂肪率の推移グラフ</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>睡眠時間と体調の相関分析</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>カロリー摂取と消費のバランス可視化</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>月次レポートで進捗確認</li>
              </ul>
            </div>
            
            <!-- 24時間記録 -->
            <div class="card-hover p-6 bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-100">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-12 h-12 bg-purple-500 bg-opacity-10 rounded-full flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-clock text-2xl text-purple-500"></i>
                </div>
                <h3 class="text-lg font-bold">24時間記録</h3>
              </div>
              <ul class="space-y-2 text-sm text-gray-700">
                <li><i class="fas fa-check text-green-500 mr-2"></i>いつでもどこでも記録可能</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>スマホ・PC・タブレット対応</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>通知機能で記録忘れ防止</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>データは自動バックアップで安心</li>
              </ul>
            </div>
            
            <!-- モチベーション管理 -->
            <div class="card-hover p-6 bg-gradient-to-br from-yellow-50 to-white rounded-lg border border-yellow-100">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-12 h-12 bg-yellow-500 bg-opacity-10 rounded-full flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-trophy text-2xl text-yellow-500"></i>
                </div>
                <h3 class="text-lg font-bold">モチベーション管理</h3>
              </div>
              <ul class="space-y-2 text-sm text-gray-700">
                <li><i class="fas fa-check text-green-500 mr-2"></i>目標達成でバッジ獲得</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>継続記録でポイント貯まる</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>同じ目標の仲間と励まし合い</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>小さな成功を可視化して自信UP</li>
              </ul>
            </div>
            
            <!-- セキュリティ -->
            <div class="card-hover p-6 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-12 h-12 bg-gray-500 bg-opacity-10 rounded-full flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-shield-alt text-2xl text-gray-600"></i>
                </div>
                <h3 class="text-lg font-bold">安心のセキュリティ</h3>
              </div>
              <ul class="space-y-2 text-sm text-gray-700">
                <li><i class="fas fa-check text-green-500 mr-2"></i>個人情報は厳重に暗号化</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>プライバシーポリシー完備</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>医療機関レベルのセキュリティ</li>
                <li><i class="fas fa-check text-green-500 mr-2"></i>いつでもデータ削除可能</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

// FAQセクション
function renderFAQSection() {
  const faqs = [
    {
      question: 'どのようなサービスですか？',
      answer: 'AIとプロのスタッフがあなたの健康管理をサポートするオンラインパーソナルジムサービスです。体重・体脂肪率・食事・睡眠などを記録すると、AIが自動で分析し、専門スタッフが個別アドバイスを提供します。'
    },
    {
      question: '料金はいくらですか？',
      answer: '月額9,900円（税込）で、AI解析・スタッフアドバイス・データ管理がすべて利用できます。初月は無料体験も可能です。'
    },
    {
      question: 'スマートフォンで利用できますか？',
      answer: 'はい、スマートフォン・タブレット・パソコンのすべてのデバイスで利用可能です。いつでもどこでも健康管理ができます。'
    },
    {
      question: '食事写真の解析はどのくらい正確ですか？',
      answer: 'AIが食材を認識し、カロリーと主要栄養素を推定します。精度は約85-90%程度です。より正確な管理が必要な場合は、手動で修正も可能です。'
    },
  ];
  
  return `
    <section id="faq" class="bg-gray-50 py-16">
      <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto">
          <h2 class="text-3xl font-bold text-center mb-12">よくある質問</h2>
          
          <div class="space-y-3">
            ${faqs.map((faq, index) => `
              <div class="bg-white rounded-lg shadow-sm overflow-hidden">
                <button onclick="toggleAccordion(this)" class="w-full px-5 py-3 text-left flex justify-between items-center hover:bg-gray-50 transition">
                  <span class="font-bold text-base">${faq.question}</span>
                  <i class="fas fa-chevron-down accordion-icon transition-transform text-sm" style="color: var(--color-primary)"></i>
                </button>
                <div class="accordion-content" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out;">
                  <div class="px-5 pb-3">
                    <p class="text-sm text-gray-600">${faq.answer}</p>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
}

// AIパーソナルジム紹介セクション
function renderGymIntroSection() {
  return `
    <section class="bg-gradient-to-br from-pink-50 to-purple-50 py-16">
      <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto">
          <div class="bg-white rounded-2xl p-6 shadow-lg">
            <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=500&fit=crop" 
              alt="AIパーソナルジム" 
              class="w-full h-80 object-cover rounded-xl shadow-lg mb-6">
            <div class="grid grid-cols-3 gap-4">
              <div class="bg-gradient-to-br from-pink-50 to-white p-4 rounded-lg text-center shadow-sm border border-pink-100">
                <div class="text-3xl font-bold text-primary mb-2">AI</div>
                <div class="text-sm text-gray-700 font-medium">食事解析</div>
                <div class="text-xs text-gray-500 mt-1">写真で自動分析</div>
              </div>
              <div class="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg text-center shadow-sm border border-blue-100">
                <div class="text-3xl font-bold text-primary mb-2">24h</div>
                <div class="text-sm text-gray-700 font-medium">記録可能</div>
                <div class="text-xs text-gray-500 mt-1">いつでもどこでも</div>
              </div>
              <div class="bg-gradient-to-br from-purple-50 to-white p-4 rounded-lg text-center shadow-sm border border-purple-100">
                <div class="text-3xl font-bold text-primary mb-2">PRO</div>
                <div class="text-sm text-gray-700 font-medium">トレーナー</div>
                <div class="text-xs text-gray-500 mt-1">専門家サポート</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

// お問い合わせセクション
function renderContactSection() {
  return `
    <section id="contact" class="bg-white py-16">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-12">お問い合わせ</h2>
        
        <div class="max-w-2xl mx-auto bg-gray-50 p-8 rounded-lg">
          <form id="contact-form" class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">お名前 <span class="text-red-500">*</span></label>
              <input type="text" name="name" required 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">メールアドレス <span class="text-red-500">*</span></label>
              <input type="email" name="email" required 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">電話番号</label>
              <input type="tel" name="phone" 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">件名 <span class="text-red-500">*</span></label>
              <input type="text" name="subject" required 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">お問い合わせ内容 <span class="text-red-500">*</span></label>
              <textarea name="message" rows="5" required 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"></textarea>
            </div>
            
            <button type="submit" class="w-full btn-primary px-6 py-3 rounded-lg font-bold text-lg">
              <i class="fas fa-paper-plane mr-2"></i>
              送信する
            </button>
          </form>
        </div>
      </div>
    </section>
  `;
}

// フッター
function renderFooter() {
  return `
    <footer class="bg-gray-800 text-white py-12">
      <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto">
          <!-- 公式サイトリンク -->
          <div class="flex flex-col md:flex-row items-center justify-center gap-6 mb-8">
            <!-- ファディ本部 -->
            <a href="https://furdi.jp/" target="_blank" rel="noopener noreferrer" 
               class="flex items-center gap-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 px-6 py-4 rounded-lg transition-all transform hover:scale-105 shadow-lg w-full md:w-auto">
              <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <i class="fas fa-home text-2xl"></i>
              </div>
              <div class="text-left">
                <div class="text-xs text-white text-opacity-80">ファディ本部</div>
                <div class="text-lg font-bold">公式サイト</div>
              </div>
              <i class="fas fa-external-link-alt ml-2"></i>
            </a>
            
            <!-- 彦根店 -->
            <a href="https://furdi.jp/shop/hikone/" target="_blank" rel="noopener noreferrer" 
               class="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-6 py-4 rounded-lg transition-all transform hover:scale-105 shadow-lg w-full md:w-auto">
              <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <i class="fas fa-map-marker-alt text-2xl"></i>
              </div>
              <div class="text-left">
                <div class="text-xs text-white text-opacity-80">ファディ</div>
                <div class="text-lg font-bold">彦根店</div>
              </div>
              <i class="fas fa-external-link-alt ml-2"></i>
            </a>
          </div>
          
          <!-- コピーライト -->
          <div class="text-center border-t border-gray-700 pt-6">
            <p class="mb-2 text-gray-300">&copy; 2025 ファディー彦根 All rights reserved.</p>
            <p class="text-sm text-gray-400">AIパーソナルジム - あなたの健康をサポート</p>
          </div>
        </div>
      </div>
    </footer>
  `;
}

// イベントリスナー設定
function setupEventListeners() {
  // 健康ログフォーム
  const healthLogForm = document.getElementById('health-log-form');
  if (healthLogForm) {
    healthLogForm.addEventListener('submit', handleHealthLogSubmit);
  }
  
  // お問い合わせフォーム
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactSubmit);
  }
}

// 体調評価選択ハンドラー
function selectConditionRating(rating) {
  const icons = ['fa-tired', 'fa-frown', 'fa-meh', 'fa-smile', 'fa-grin-stars'];
  const colors = ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-green-500', 'text-blue-500'];
  
  // すべての評価ボタンを更新
  for (let i = 1; i <= 5; i++) {
    const radio = document.getElementById(`condition-rating-${i}`);
    const label = document.getElementById(`condition-rating-label-${i}`);
    const icon = document.getElementById(`condition-rating-icon-${i}`);
    const text = document.getElementById(`condition-rating-text-${i}`);
    
    if (i === rating) {
      // 選択された評価
      radio.checked = true;
      label.className = 'flex flex-col items-center p-3 rounded-lg transition bg-white shadow-md';
      icon.className = `fas ${icons[i-1]} text-3xl ${colors[i-1]} mb-1`;
      text.className = 'text-xs font-medium text-gray-800';
    } else {
      // 選択されていない評価
      radio.checked = false;
      label.className = 'flex flex-col items-center p-3 rounded-lg transition hover:bg-white hover:bg-opacity-50';
      icon.className = `fas ${icons[i-1]} text-3xl text-gray-400 mb-1`;
      text.className = 'text-xs font-medium text-gray-500';
    }
  }
}

// 日付変更ハンドラー（前後移動）
async function changeLogDate(days) {
  if (!selectedDate) selectedDate = dayjs().format('YYYY-MM-DD');
  
  const newDate = dayjs(selectedDate).add(days, 'day').format('YYYY-MM-DD');
  selectedDate = newDate;
  
  // 日付ピッカーの値を更新
  const picker = document.getElementById('log-date-picker');
  if (picker) picker.value = newDate;
  
  // ログを読み込んでページを再レンダリング
  await loadLogForDate(selectedDate);
}

// 日付ピッカーから変更
async function changeLogDateFromPicker(dateString) {
  selectedDate = dateString;
  await loadLogForDate(selectedDate);
}

// 今日に戻る
async function goToToday() {
  selectedDate = dayjs().format('YYYY-MM-DD');
  
  const picker = document.getElementById('log-date-picker');
  if (picker) picker.value = selectedDate;
  
  await loadLogForDate(selectedDate);
}

// 日付の表示フォーマット
function formatDateDisplay(dateString) {
  const date = dayjs(dateString);
  const today = dayjs().format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  
  if (dateString === today) {
    return `今日 (${date.format('M月D日')})`;
  } else if (dateString === yesterday) {
    return `昨日 (${date.format('M月D日')})`;
  } else if (dateString === tomorrow) {
    return `明日 (${date.format('M月D日')})`;
  } else {
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.day()];
    return `${date.format('YYYY年M月D日')} (${dayOfWeek})`;
  }
}

// 健康ログ送信
async function handleHealthLogSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  
  // 合計栄養素を計算
  const totalCalories = mealData.breakfast.calories + mealData.lunch.calories + mealData.dinner.calories;
  const totalProtein = mealData.breakfast.protein + mealData.lunch.protein + mealData.dinner.protein;
  const totalFat = mealData.breakfast.fat + mealData.lunch.fat + mealData.dinner.fat;
  const totalCarbs = mealData.breakfast.carbs + mealData.lunch.carbs + mealData.dinner.carbs;
  
  const data = {
    log_date: selectedDate || dayjs().format('YYYY-MM-DD'),
    weight: formData.get('weight') ? parseFloat(formData.get('weight')) : null,
    body_fat_percentage: formData.get('body_fat_percentage') ? parseFloat(formData.get('body_fat_percentage')) : null,
    body_temperature: formData.get('body_temperature') ? parseFloat(formData.get('body_temperature')) : null,
    sleep_hours: formData.get('sleep_hours') ? parseFloat(formData.get('sleep_hours')) : null,
    exercise_minutes: formData.get('exercise_minutes') ? parseInt(formData.get('exercise_minutes')) : null,
    condition_rating: formData.get('condition_rating') ? parseInt(formData.get('condition_rating')) : 3,
    condition_note: formData.get('condition_note') || null,
    // 食事データ (新フォーマット: 朝昼晩の内訳 + 写真配列)
    meals: {
      breakfast: {
        calories: mealData.breakfast.calories || 0,
        protein: mealData.breakfast.protein || 0,
        carbs: mealData.breakfast.carbs || 0,
        fat: mealData.breakfast.fat || 0,
        photos: mealData.breakfast.photos || [],
        input_method: mealData.breakfast.photos?.length > 0 ? 'ai' : 'manual'
      },
      lunch: {
        calories: mealData.lunch.calories || 0,
        protein: mealData.lunch.protein || 0,
        carbs: mealData.lunch.carbs || 0,
        fat: mealData.lunch.fat || 0,
        photos: mealData.lunch.photos || [],
        input_method: mealData.lunch.photos?.length > 0 ? 'ai' : 'manual'
      },
      dinner: {
        calories: mealData.dinner.calories || 0,
        protein: mealData.dinner.protein || 0,
        carbs: mealData.dinner.carbs || 0,
        fat: mealData.dinner.fat || 0,
        photos: mealData.dinner.photos || [],
        input_method: mealData.dinner.photos?.length > 0 ? 'ai' : 'manual'
      }
    }
  };
  
  try {
    let response;
    if (todayLog) {
      response = await apiCall(`/api/health-logs/${todayLog.id}`, {
        method: 'PUT',
        data: data,
      });
    } else {
      response = await apiCall('/api/health-logs', {
        method: 'POST',
        data: data,
      });
    }
    
    if (response.success) {
      showToast('健康ログを保存しました', 'success');
      
      // 選択された日付のログを再読み込み
      await loadLogForDate(selectedDate);
    }
  } catch (error) {
    showToast('保存に失敗しました', 'error');
  }
}

// 食事写真追加モーダル
function showMealModal(mealType) {
  const mealNames = {
    breakfast: '朝食',
    lunch: '昼食',
    dinner: '夕食'
  };
  
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-6 max-w-md">
      <h3 class="text-xl font-bold mb-4">${mealNames[mealType]}の写真を追加</h3>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">写真を選択（複数可）</label>
          <input type="file" id="meal-photos-input" accept="image/*" multiple
            class="w-full px-4 py-2 border rounded-lg">
        </div>
        
        <div id="preview-container" class="grid grid-cols-3 gap-2"></div>
        
        <div class="flex gap-3">
          <button onclick="this.closest('.modal-backdrop').remove()" 
            class="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">
            キャンセル
          </button>
          <button onclick="analyzeMealPhotos('${mealType}')" 
            class="flex-1 px-4 py-2 bg-accent text-white hover:bg-opacity-90 rounded-lg">
            <i class="fas fa-robot mr-1"></i>AI解析
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // ファイル選択時のプレビュー
  document.getElementById('meal-photos-input').addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    const previewContainer = document.getElementById('preview-container');
    previewContainer.innerHTML = '';
    
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.src = event.target.result;
        img.className = 'w-full h-24 object-cover rounded-lg';
        previewContainer.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
}

// 食事写真をAI解析
async function analyzeMealPhotos(mealType) {
  const input = document.getElementById('meal-photos-input');
  const files = Array.from(input.files);
  
  if (files.length === 0) {
    showToast('写真を選択してください', 'warning');
    return;
  }
  
  try {
    showLoading();
    
    // 各写真をアップロードして解析
    const analyses = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('log_date', dayjs().format('YYYY-MM-DD'));
      formData.append('meal_type', mealType);
      
      const token = getToken();
      const response = await axios.post('/api/health-logs/upload-meal', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        }
      });
      
      if (response.data.success) {
        analyses.push(response.data.data.analysis);
      }
    }
    
    hideLoading();
    
    // 合計を計算
    const total = analyses.reduce((acc, analysis) => {
      return {
        calories: acc.calories + (analysis.カロリー || 0),
        protein: acc.protein + (analysis.タンパク質 || 0),
        fat: acc.fat + (analysis.脂質 || 0),
        carbs: acc.carbs + (analysis.炭水化物 || 0)
      };
    }, { calories: 0, protein: 0, fat: 0, carbs: 0 });
    
    // データを保存
    mealData[mealType] = {
      photos: analyses,
      calories: total.calories,
      protein: total.protein,
      fat: total.fat,
      carbs: total.carbs
    };
    
    // UI更新（新レイアウト対応）
    updateMealDisplay(mealType);
    updateMealPhotosDisplay();
    updateTotalNutrition();
    
    showToast(`${files.length}枚の写真を解析しました`, 'success');
    document.querySelector('.modal-backdrop')?.remove();
    
  } catch (error) {
    hideLoading();
    showToast('解析に失敗しました', 'error');
  }
}

// 食事表示を更新
function updateMealDisplay(mealType) {
  const data = mealData[mealType];
  
  // 写真表示
  const photosContainer = document.getElementById(`${mealType}-photos`);
  if (photosContainer && data.photos.length > 0) {
    photosContainer.innerHTML = data.photos.map((analysis, index) => `
      <div class="relative">
        <div class="bg-green-100 border border-green-300 rounded-lg p-2 text-xs">
          <div class="font-bold text-green-800">写真 ${index + 1}</div>
          <div>${analysis.カロリー || 0} kcal</div>
        </div>
      </div>
    `).join('');
  }
  
  // 栄養素表示
  document.getElementById(`${mealType}-calories`).value = data.calories;
  document.getElementById(`${mealType}-protein`).value = data.protein;
  document.getElementById(`${mealType}-fat`).value = data.fat;
  document.getElementById(`${mealType}-carbs`).value = data.carbs;
}

// 合計栄養素を更新
function updateTotalNutrition() {
  const total = {
    calories: mealData.breakfast.calories + mealData.lunch.calories + mealData.dinner.calories,
    protein: mealData.breakfast.protein + mealData.lunch.protein + mealData.dinner.protein,
    fat: mealData.breakfast.fat + mealData.lunch.fat + mealData.dinner.fat,
    carbs: mealData.breakfast.carbs + mealData.lunch.carbs + mealData.dinner.carbs
  };
  
  // 総カロリー入力フィールド更新
  const totalCaloriesInput = document.getElementById('total-calories-input');
  if (totalCaloriesInput) totalCaloriesInput.value = total.calories;
  
  // ブレークダウン表示更新
  const breakdownEl = document.getElementById('total-calories-breakdown');
  if (breakdownEl) {
    breakdownEl.textContent = `朝${mealData.breakfast.calories} + 昼${mealData.lunch.calories} + 夕${mealData.dinner.calories}`;
  }
  
  const totalProteinEl = document.getElementById('total-protein');
  if (totalProteinEl) totalProteinEl.textContent = total.protein;
  
  const totalFatEl = document.getElementById('total-fat');
  if (totalFatEl) totalFatEl.textContent = total.fat;
  
  const totalCarbsEl = document.getElementById('total-carbs');
  if (totalCarbsEl) totalCarbsEl.textContent = total.carbs;
}

// 総カロリー手動入力対応
function updateTotalCaloriesDisplay() {
  const totalCaloriesInput = document.getElementById('total-calories-input');
  if (!totalCaloriesInput) return;
  
  const manualTotal = parseFloat(totalCaloriesInput.value) || 0;
  
  // ブレークダウン表示更新
  const breakdownEl = document.getElementById('total-calories-breakdown');
  if (breakdownEl) {
    breakdownEl.textContent = `朝${mealData.breakfast.calories} + 昼${mealData.lunch.calories} + 夕${mealData.dinner.calories}`;
  }
}

// BMI表示更新
function updateBMIDisplay() {
  const weightInput = document.getElementById('weight-input');
  const bmiDisplay = document.getElementById('bmi-display');
  
  if (!weightInput || !bmiDisplay) return;
  
  const weight = parseFloat(weightInput.value) || 0;
  const height = currentUser?.height || 0; // ユーザープロフィールの身長
  
  if (weight > 0 && height > 0) {
    const heightM = height / 100; // cmをmに変換
    const bmi = (weight / (heightM * heightM)).toFixed(1);
    
    // BMI判定と色分け
    let color = 'text-gray-600';
    if (bmi < 18.5) {
      color = 'text-blue-600';
    } else if (bmi < 25) {
      color = 'text-green-600';
    } else if (bmi < 30) {
      color = 'text-orange-600';
    } else {
      color = 'text-red-600';
    }
    
    bmiDisplay.textContent = bmi;
    bmiDisplay.className = `text-lg font-bold ${color}`;
  } else {
    bmiDisplay.textContent = '-';
    bmiDisplay.className = 'text-lg font-bold text-gray-400';
  }
}

// 食事栄養素手動更新 (新関数 - カロリー + PFC対応)
function updateMealNutrition(mealType, nutrientType, value) {
  const val = parseFloat(value) || 0;
  mealData[mealType][nutrientType] = val;
  
  // 入力フィールドに反映
  const input = document.getElementById(`${mealType}-${nutrientType}`);
  if (input) input.value = val;
  
  // 合計更新
  updateTotalNutrition();
}

// PFC入力セクションの表示切替
function toggleMealPFC(mealType) {
  const pfcSection = document.getElementById(`${mealType}-pfc`);
  const arrow = document.getElementById(`${mealType}-pfc-arrow`);
  
  if (pfcSection && arrow) {
    pfcSection.classList.toggle('hidden');
    arrow.classList.toggle('fa-chevron-down');
    arrow.classList.toggle('fa-chevron-up');
  }
}

// パスワード表示/非表示切替
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(`${inputId}-icon`);
  
  if (!input || !icon) return;
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}

// 食事カロリー手動更新 (旧関数 - 互換性維持)
function updateMealCalories(mealType, calories) {
  updateMealNutrition(mealType, 'calories', calories);
}

// 食事写真アップロード (旧関数 - 互換性のため残す)
async function uploadMealPhoto() {
  const fileInput = document.getElementById('meal-photo');
  const file = fileInput.files[0];
  
  if (!file) {
    showToast('写真を選択してください', 'warning');
    return;
  }
  
  const formData = new FormData();
  formData.append('photo', file);
  formData.append('log_date', dayjs().format('YYYY-MM-DD'));
  
  try {
    showLoading();
    const token = getToken();
    const response = await axios.post('/api/health-logs/upload-meal', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      }
    });
    hideLoading();
    
    if (response.data.success) {
      const analysis = response.data.data.analysis;
      document.getElementById('meal-analysis-result').innerHTML = `
        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 class="font-bold text-green-800 mb-2">
            <i class="fas fa-check-circle mr-1"></i>
            AI解析結果
          </h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div><strong>カロリー:</strong> ${analysis.カロリー} kcal</div>
            <div><strong>タンパク質:</strong> ${analysis.タンパク質} g</div>
            <div><strong>炭水化物:</strong> ${analysis.炭水化物} g</div>
            <div><strong>脂質:</strong> ${analysis.脂質} g</div>
          </div>
          <p class="mt-3 text-green-700">${analysis.評価}</p>
          <div class="mt-2 text-xs text-gray-600">
            <strong>検出された食材:</strong> ${analysis.食材.join('、')}
          </div>
        </div>
      `;
      showToast('AI解析が完了しました', 'success');
      
      // フォームに自動入力
      await loadTodayLog();
    }
  } catch (error) {
    hideLoading();
    showToast('解析に失敗しました', 'error');
  }
}

// お問い合わせ送信
async function handleContactSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone') || null,
    subject: formData.get('subject'),
    message: formData.get('message'),
  };
  
  if (!validateEmail(data.email)) {
    showToast('有効なメールアドレスを入力してください', 'warning');
    return;
  }
  
  try {
    showLoading();
    const response = await axios.post('/api/inquiries', data);
    hideLoading();
    
    if (response.data.success) {
      showToast(response.data.message, 'success');
      e.target.reset();
    }
  } catch (error) {
    hideLoading();
    showToast('送信に失敗しました', 'error');
  }
}

// ログイン/新規登録モーダル表示
function showLoginModal(showAdminOption = false) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-8 max-w-md">
      <div class="text-center mb-6">
        <h3 class="text-2xl font-bold mb-2">ログイン / 新規登録</h3>
        <p class="text-gray-600">以下の方法でアクセスしてください</p>
      </div>
      
      <!-- SNS認証 -->
      <div class="space-y-3 mb-4">
        <button onclick="loginWithGoogle()" class="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-gray-300 hover:border-primary rounded-lg transition">
          <i class="fab fa-google text-xl" style="color: #DB4437"></i>
          <span class="font-medium">Googleでログイン</span>
        </button>
        
        <button onclick="loginWithLine()" class="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-gray-300 hover:border-primary rounded-lg transition">
          <i class="fab fa-line text-xl" style="color: #00B900"></i>
          <span class="font-medium">LINEでログイン</span>
        </button>
      </div>
      
      <!-- 区切り線 -->
      <div class="relative my-4">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-white text-gray-500">または</span>
        </div>
      </div>
      
      <!-- メールログイン/新規登録 -->
      <form id="email-auth-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">メールアドレス *</label>
          <input type="email" name="email" required 
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">パスワード *</label>
          <div class="relative">
            <input type="password" name="password" id="email-password" required minlength="6"
              class="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
            <button type="button" onclick="togglePasswordVisibility('email-password')"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
              <i class="fas fa-eye" id="email-password-icon"></i>
            </button>
          </div>
        </div>
        
        <button type="submit" class="w-full btn-primary px-6 py-3 rounded-lg font-bold">
          <i class="fas fa-envelope mr-2"></i>
          メールでログイン / 新規登録
        </button>
      </form>
      
      <p class="text-xs text-gray-500 text-center mt-3">
        初めての方は自動的に新規登録されます
      </p>
      
      ${showAdminOption ? `
        <!-- 管理者ログインオプション (失敗時のみ表示) -->
        <div class="border-t pt-4 mt-4">
          <p class="text-xs text-gray-600 text-center mb-3">
            <i class="fas fa-shield-alt mr-1"></i>
            管理者の方はこちら
          </p>
          <button onclick="showAdminLoginModal()" class="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition">
            管理者ログイン
          </button>
        </div>
      ` : ''}
      
      <button onclick="this.closest('.modal-backdrop').remove()" class="mt-6 w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg transition">
        キャンセル
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // イベントリスナー設定
  document.getElementById('email-auth-form')?.addEventListener('submit', handleEmailAuth);
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
}

// 管理者ログインモーダル (ログイン失敗時のみ)
function showAdminLoginModal() {
  // 既存のモーダルを閉じる
  document.querySelector('.modal-backdrop')?.remove();
  
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-8 max-w-md">
      <div class="text-center mb-6">
        <h3 class="text-2xl font-bold mb-2">
          <i class="fas fa-shield-alt text-primary mr-2"></i>
          管理者ログイン
        </h3>
        <p class="text-gray-600">管理者アカウントでログイン</p>
      </div>
      
      <form id="admin-login-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">メールアドレス *</label>
          <input type="email" name="email" required value="admin@furdi.jp"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-1">パスワード *</label>
          <div class="relative">
            <input type="password" name="password" id="admin-password" required value="admin123"
              class="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
            <button type="button" onclick="togglePasswordVisibility('admin-password')"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
              <i class="fas fa-eye" id="admin-password-icon"></i>
            </button>
          </div>
        </div>
        
        <button type="submit" class="w-full btn-primary px-6 py-3 rounded-lg font-bold">
          <i class="fas fa-sign-in-alt mr-2"></i>
          ログイン
        </button>
      </form>
      
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
        <p class="text-xs text-yellow-800">
          <i class="fas fa-info-circle mr-1"></i>
          <strong>デモ用管理者アカウント:</strong><br>
          メール: admin@furdi.jp<br>
          パスワード: admin123
        </p>
      </div>
      
      <button onclick="showLoginModal()" class="mt-4 w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg transition">
        <i class="fas fa-arrow-left mr-2"></i>
        通常ログインに戻る
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // イベントリスナー設定
  document.getElementById('admin-login-form')?.addEventListener('submit', handleAdminLogin);
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
}

// 認証タブ切り替え (削除 - タブなしのシンプルなUIに変更)

// Google認証 (モック)
async function loginWithGoogle() {
  try {
    showLoading();
    // 本番環境ではGoogle OAuthフローを実装
    const response = await axios.post('/api/auth/google', { token: 'mock_google_token' });
    hideLoading();
    
    if (response.data.success) {
      setToken(response.data.data.token);
      setUserData(response.data.data.user);
      showToast('ログインしました', 'success');
      document.querySelector('.modal-backdrop')?.remove();
      location.reload();
    }
  } catch (error) {
    hideLoading();
    showToast('ログインに失敗しました', 'error');
    // ログイン失敗時、管理者ログインオプションを表示
    document.querySelector('.modal-backdrop')?.remove();
    showLoginModal(true);
  }
}

// LINE認証 (モック)
async function loginWithLine() {
  try {
    showLoading();
    // 本番環境ではLINE OAuthフローを実装
    const response = await axios.post('/api/auth/line', { code: 'mock_line_code' });
    hideLoading();
    
    if (response.data.success) {
      setToken(response.data.data.token);
      setUserData(response.data.data.user);
      showToast('ログインしました', 'success');
      document.querySelector('.modal-backdrop')?.remove();
      location.reload();
    }
  } catch (error) {
    hideLoading();
    showToast('ログインに失敗しました', 'error');
    // ログイン失敗時、管理者ログインオプションを表示
    document.querySelector('.modal-backdrop')?.remove();
    showLoginModal(true);
  }
}

// メール認証 (ログイン/新規登録の統合)
async function handleEmailAuth(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const email = formData.get('email');
  const password = formData.get('password');
  
  try {
    showLoading();
    
    // まずログインを試行
    try {
      const loginResponse = await axios.post('/api/auth/login', { email, password });
      
      if (loginResponse.data.success) {
        setToken(loginResponse.data.data.token);
        setUserData(loginResponse.data.data.user);
        hideLoading();
        showToast('ログインしました', 'success');
        document.querySelector('.modal-backdrop')?.remove();
        location.reload();
        return;
      }
    } catch (loginError) {
      // ログイン失敗 → 新規登録を試行
      const registerData = {
        name: email.split('@')[0], // メールアドレスの@前を名前として使用
        email: email,
        password: password,
      };
      
      const registerResponse = await axios.post('/api/auth/register', registerData);
      
      if (registerResponse.data.success) {
        setToken(registerResponse.data.data.token);
        setUserData(registerResponse.data.data.user);
        hideLoading();
        showToast('新規登録してログインしました', 'success');
        document.querySelector('.modal-backdrop')?.remove();
        location.reload();
        return;
      }
    }
  } catch (error) {
    hideLoading();
    const message = error.response?.data?.error || '認証に失敗しました';
    showToast(message, 'error');
    // 失敗時、管理者ログインオプションを表示
    document.querySelector('.modal-backdrop')?.remove();
    showLoginModal(true);
  }
}

// メール新規登録 (旧関数 - 互換性維持)
async function handleEmailRegister(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  };
  
  if (!validateEmail(data.email)) {
    showToast('有効なメールアドレスを入力してください', 'warning');
    return;
  }
  
  try {
    showLoading();
    const response = await axios.post('/api/auth/register', data);
    hideLoading();
    
    if (response.data.success) {
      setToken(response.data.data.token);
      setUserData(response.data.data.user);
      showToast('登録が完了しました！', 'success');
      document.querySelector('.modal-backdrop')?.remove();
      location.reload();
    }
  } catch (error) {
    hideLoading();
    const message = error.response?.data?.error || '登録に失敗しました';
    showToast(message, 'error');
  }
}

// 管理者ログイン
async function handleAdminLogin(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    email: formData.get('email'),
    password: formData.get('password'),
  };
  
  try {
    showLoading();
    const response = await axios.post('/api/auth/admin-login', data);
    hideLoading();
    
    if (response.data.success) {
      setToken(response.data.data.token);
      setUserData(response.data.data.user);
      showToast('管理者としてログインしました', 'success');
      document.querySelector('.modal-backdrop')?.remove();
      location.reload();
    }
  } catch (error) {
    hideLoading();
    const message = error.response?.data?.error || 'ログインに失敗しました';
    showToast(message, 'error');
  }
}

// ヘルパー関数
function getAdviceTypeLabel(type) {
  const labels = {
    diet: '食事',
    exercise: '運動',
    general: '全般',
  };
  return labels[type] || type;
}

function getAdviceColor(type) {
  const colors = {
    diet: 'success',
    exercise: 'warning',
    general: 'primary',
  };
  return colors[type] || 'primary';
}

function toggleMobileMenu() {
  showToast('モバイルメニューは今後実装予定です', 'info');
}

// お知らせ取得
async function loadAnnouncements() {
  try {
    const response = await apiCall('/api/announcements');
    if (response.success) {
      announcements = response.data.slice(0, 2); // 最新2件のみ
    }
  } catch (error) {
    console.error('お知らせの取得に失敗:', error);
  }
}

// お知らせセクション（小さく表示）
function renderAnnouncementsSection() {
  if (announcements.length === 0) return '';
  
  return `
    <section class="bg-white py-4">
      <div class="container mx-auto px-4">
        <div class="max-w-7xl mx-auto">
          <div class="flex items-center gap-2 mb-2">
            <i class="fas fa-bullhorn text-primary text-sm"></i>
            <h3 class="text-sm font-bold text-gray-800">お知らせ</h3>
          </div>
          
          <div class="space-y-2">
            ${announcements.map(announcement => `
              <div class="flex gap-2 items-start bg-gray-50 p-2 rounded hover:bg-gray-100 transition cursor-pointer"
                   onclick="showAnnouncementDetail(${announcement.id})">
                ${announcement.image_url ? `
                  <img src="${announcement.image_url}" alt="${announcement.title}" 
                    class="w-12 h-12 object-cover rounded flex-shrink-0">
                ` : ''}
                <div class="flex-1 min-w-0">
                  <h4 class="text-xs font-bold text-gray-800 truncate">${announcement.title}</h4>
                  <p class="text-xs text-gray-600 line-clamp-2 leading-tight">${announcement.content}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
}

// お知らせ詳細モーダル
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

// スタッフコメント取得（最新1件）
async function loadLatestStaffComment() {
  try {
    const response = await apiCall(`/api/comments/user/${currentUser.id}`);
    if (response.success && response.data.length > 0) {
      latestStaffComment = response.data[0]; // 最新の1件のみ
    }
  } catch (error) {
    console.error('スタッフコメントの取得に失敗:', error);
  }
}

// 質問を送信（トップページから）
async function submitQuestion() {
  const questionInput = document.getElementById('question-input');
  const question = questionInput.value.trim();
  
  if (!question) {
    showToast('質問を入力してください', 'warning');
    return;
  }
  
  if (!currentUser) {
    showToast('ログインが必要です', 'warning');
    showLoginModal();
    return;
  }
  
  try {
    const response = await apiCall('/api/opinions', 'POST', { question });
    
    if (response.success) {
      showToast('質問を送信しました', 'success');
      questionInput.value = '';
    }
  } catch (error) {
    showToast('送信に失敗しました', 'error');
  }
}

// ダッシュボード更新（新機能）
function updateDashboard() {
  if (!todayLog) return;
  
  // 総カロリー
  const totalCalories = (todayLog.meal_calories || 0);
  const dashboardCalories = document.getElementById('dashboard-calories');
  if (dashboardCalories) {
    dashboardCalories.textContent = totalCalories > 0 ? `${totalCalories}kcal` : '-';
  }
  
  // 運動時間
  const exerciseMinutes = todayLog.exercise_minutes || 0;
  const dashboardExercise = document.getElementById('dashboard-exercise');
  if (dashboardExercise) {
    dashboardExercise.textContent = exerciseMinutes > 0 ? `${exerciseMinutes}分` : '-';
  }
  
  // 体重
  const weight = todayLog.weight;
  const dashboardWeight = document.getElementById('dashboard-weight');
  const dashboardWeightChange = document.getElementById('dashboard-weight-change');
  if (dashboardWeight) {
    dashboardWeight.textContent = weight ? `${weight}kg` : '-';
  }
  
  // 体重変化（前日比）を計算（仮データ）
  if (dashboardWeightChange && weight) {
    const change = -0.3; // 実際は前日のデータと比較
    const changeText = change > 0 ? `+${change}kg` : `${change}kg`;
    const changeColor = change > 0 ? 'text-red-600' : 'text-green-600';
    dashboardWeightChange.innerHTML = `前回比: <span class="${changeColor} font-bold">${changeText}</span>`;
  }
  
  // 連続記録日数（仮データ - 実際はAPIから取得）
  const dashboardStreak = document.getElementById('dashboard-streak');
  if (dashboardStreak) {
    dashboardStreak.innerHTML = `<span class="text-primary">7</span>`;
  }
}

// クイック運動記録（新機能）
function quickExercise(type, minutes) {
  const exerciseInput = document.getElementById('exercise-minutes');
  const exerciseNote = document.querySelector('textarea[name="condition_note"]');
  
  if (exerciseInput) {
    const currentValue = parseInt(exerciseInput.value) || 0;
    exerciseInput.value = currentValue + minutes;
    exerciseInput.focus();
    
    // スクロール
    exerciseInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  
  if (exerciseNote) {
    const currentNote = exerciseNote.value;
    const newNote = currentNote ? `${currentNote}\n${type}を${minutes}分実施` : `${type}を${minutes}分実施`;
    exerciseNote.value = newNote;
  }
  
  showToast(`${type} ${minutes}分を追加しました`, 'success');
}

// カロリー計算（新機能）
function calculateCalories() {
  const minutes = parseInt(document.getElementById('calc-minutes').value) || 0;
  const intensity = parseInt(document.getElementById('calc-intensity').value) || 5;
  const weight = currentUser?.weight || 60; // デフォルト60kg
  
  // 消費カロリー = MET × 体重(kg) × 時間(h) × 1.05
  const calories = Math.round(intensity * weight * (minutes / 60) * 1.05);
  
  const resultDiv = document.getElementById('calorie-result');
  if (resultDiv) {
    resultDiv.innerHTML = `
      <div class="bg-white p-2 rounded-lg mt-2">
        <div class="text-2xl font-bold text-orange-600">${calories}</div>
        <div class="text-xs text-gray-600">kcal 消費</div>
      </div>
    `;
  }
}

// 目標設定モーダル（新機能）
function openGoalSettings() {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-4 max-w-md">
      <h3 class="text-lg font-bold mb-3">
        <i class="fas fa-bullseye mr-2 text-green-500"></i>
        週間目標設定
      </h3>
      
      <div class="space-y-3">
        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1">
            運動回数（週）
          </label>
          <input type="number" id="goal-exercise" value="5" min="1" max="7"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
        </div>
        
        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1">
            体重記録回数（週）
          </label>
          <input type="number" id="goal-weight" value="7" min="1" max="7"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
        </div>
        
        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1">
            目標体重（kg）
          </label>
          <input type="number" step="0.1" id="goal-target-weight" value="${currentUser?.weight || 60}"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
        </div>
      </div>
      
      <div class="flex gap-2 mt-4">
        <button onclick="saveGoalSettings(); this.closest('.modal-backdrop').remove();" 
          class="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition font-medium">
          保存
        </button>
        <button onclick="this.closest('.modal-backdrop').remove();" 
          class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">
          キャンセル
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// 目標保存（新機能）
function saveGoalSettings() {
  const exerciseGoal = document.getElementById('goal-exercise').value;
  const weightGoal = document.getElementById('goal-weight').value;
  const targetWeight = document.getElementById('goal-target-weight').value;
  
  // LocalStorage に保存
  localStorage.setItem('weeklyGoals', JSON.stringify({
    exercise: exerciseGoal,
    weight: weightGoal,
    targetWeight: targetWeight
  }));
  
  showToast('目標を保存しました', 'success');
}

// フォームへスクロール
function scrollToForm() {
  const form = document.getElementById('health-log-form');
  if (form) {
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// 隠しフィールドと同期
function syncHiddenField(sourceId, targetId) {
  const source = document.getElementById(sourceId);
  const target = document.getElementById(targetId);
  
  if (source && target) {
    target.value = source.value;
  }
}

// 運動トラッカーの折りたたみトグル
function toggleExerciseTracker() {
  const tracker = document.getElementById('exercise-tracker');
  const arrow = document.getElementById('exercise-tracker-arrow');
  
  if (tracker && arrow) {
    if (tracker.classList.contains('hidden')) {
      tracker.classList.remove('hidden');
      arrow.classList.add('rotate-180');
    } else {
      tracker.classList.add('hidden');
      arrow.classList.remove('rotate-180');
    }
  }
}

// 詳細入力の折りたたみトグル
function toggleDetailedInputs() {
  const detailedInputs = document.getElementById('detailed-inputs');
  const arrow = document.getElementById('detailed-inputs-arrow');
  
  if (detailedInputs && arrow) {
    if (detailedInputs.classList.contains('hidden')) {
      detailedInputs.classList.remove('hidden');
      arrow.classList.add('rotate-180');
    } else {
      detailedInputs.classList.add('hidden');
      arrow.classList.remove('rotate-180');
    }
  }
}

// 食事写真表示の更新（新レイアウト対応）
function updateMealPhotosDisplay() {
  ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
    const photosDiv = document.getElementById(`${mealType}-photos`);
    const meal = mealData[mealType];
    
    if (!photosDiv) return;
    
    // 写真情報を表示（新レイアウト）
    if (meal.photos && meal.photos.length > 0) {
      photosDiv.innerHTML = `<i class="fas fa-check-circle text-green-500 mr-1"></i>${meal.photos.length}枚`;
    } else {
      photosDiv.innerHTML = '';
    }
    
    // カロリー入力欄を更新
    const caloriesInput = document.getElementById(`${mealType}-calories`);
    if (caloriesInput) {
      caloriesInput.value = meal.calories || 0;
    }
    
    // 隠しフィールドも更新
    ['protein', 'fat', 'carbs'].forEach(field => {
      const input = document.getElementById(`${mealType}-${field}`);
      if (input) input.value = meal[field] || 0;
    });
  });
  
  // 合計カロリー更新
  updateTotalNutrition();
}

// =============================================================================
// 運動トラッカー関数
// =============================================================================

// 運動データ
const exerciseMET = {
  'furdi': 5,
  'weight-training': 6,
  'running': 8,
  'jogging': 5,
  'walking': 3,
  'cycling': 6,
  'swimming': 8,
  'yoga': 3,
  'pilates': 4,
  'stretch': 2.5,
  'hiit': 10,
  'dance': 5,
  'boxing': 9
};

// 運動トグル
function toggleExercise(exerciseId) {
  const toggle = document.getElementById(`exercise-toggle-${exerciseId}`);
  if (!toggle) return;
  
  const isActive = toggle.getAttribute('data-active') === 'true';
  const newState = !isActive;
  
  toggle.setAttribute('data-active', newState);
  
  if (newState) {
    // アクティブ化
    toggle.classList.remove('bg-gray-200');
    toggle.classList.add('bg-primary');
    const knob = toggle.querySelector('div');
    knob.classList.remove('left-1');
    knob.classList.add('left-5');
  } else {
    // 非アクティブ化
    toggle.classList.remove('bg-primary');
    toggle.classList.add('bg-gray-200');
    const knob = toggle.querySelector('div');
    knob.classList.remove('left-5');
    knob.classList.add('left-1');
  }
  
  updateExerciseSummary();
}

// 運動サマリー更新
function updateExerciseSummary() {
  let totalTime = 0;
  let totalCalories = 0;
  const weight = currentUser?.weight || 60; // ユーザー体重（デフォルト60kg）
  
  Object.keys(exerciseMET).forEach(exerciseId => {
    const toggle = document.getElementById(`exercise-toggle-${exerciseId}`);
    const timeInput = document.getElementById(`exercise-time-${exerciseId}`);
    const calDisplay = document.getElementById(`exercise-cal-${exerciseId}`);
    
    if (!toggle || !timeInput || !calDisplay) return;
    
    const isActive = toggle.getAttribute('data-active') === 'true';
    const minutes = parseFloat(timeInput.value) || 0;
    const met = exerciseMET[exerciseId];
    
    if (isActive && minutes > 0) {
      // MET計算式: カロリー = MET × 体重(kg) × 時間(h) × 1.05
      const calories = Math.round(met * weight * (minutes / 60) * 1.05);
      totalTime += minutes;
      totalCalories += calories;
      calDisplay.textContent = `${calories}kcal`;
      calDisplay.classList.remove('text-gray-400');
      calDisplay.classList.add('text-orange-600', 'font-bold');
    } else {
      calDisplay.textContent = '0kcal';
      calDisplay.classList.remove('text-orange-600', 'font-bold');
      calDisplay.classList.add('text-gray-400');
    }
  });
  
  // サマリー表示更新
  const totalTimeEl = document.getElementById('total-exercise-time');
  const totalCaloriesEl = document.getElementById('total-exercise-calories');
  
  if (totalTimeEl) totalTimeEl.textContent = totalTime;
  if (totalCaloriesEl) totalCaloriesEl.textContent = totalCalories;
  
  // 隠しフィールドも更新（フォーム送信用）
  const exerciseMinutesHidden = document.getElementById('exercise-minutes-hidden');
  if (exerciseMinutesHidden) {
    exerciseMinutesHidden.value = totalTime;
  }
}

// =============================================================================
// 便利ツール関数
// =============================================================================

// クイック運動記録
function quickExercise(exerciseType, minutes) {
  const exerciseInput = document.getElementById('exercise-minutes');
  if (exerciseInput) {
    exerciseInput.value = minutes;
    showToast(`${exerciseType} ${minutes}分を記録しました`, 'success');
  }
}

// カロリー計算機
function calculateCalories() {
  const minutes = parseFloat(document.getElementById('calc-minutes')?.value || 0);
  const intensity = parseFloat(document.getElementById('calc-intensity')?.value || 5);
  const weight = currentUser?.weight || 60; // ユーザーの体重（デフォルト60kg）
  
  if (minutes <= 0) {
    showToast('運動時間を入力してください', 'warning');
    return;
  }
  
  // MET計算式: カロリー = MET × 体重(kg) × 時間(h) × 1.05
  const calories = Math.round(intensity * weight * (minutes / 60) * 1.05);
  
  const resultDiv = document.getElementById('calorie-result');
  if (resultDiv) {
    resultDiv.textContent = `約 ${calories} kcal`;
  }
  
  showToast(`消費カロリー: 約${calories}kcal`, 'success');
}

// BMI計算
function calculateBMI() {
  const height = parseFloat(document.getElementById('bmi-height')?.value || 0);
  const weight = parseFloat(document.getElementById('bmi-weight')?.value || 0);
  
  if (height <= 0 || weight <= 0) {
    showToast('身長と体重を入力してください', 'warning');
    return;
  }
  
  const heightM = height / 100; // cmをmに変換
  const bmi = (weight / (heightM * heightM)).toFixed(1);
  
  let category = '';
  let color = '';
  
  if (bmi < 18.5) {
    category = '低体重';
    color = 'text-blue-600';
  } else if (bmi < 25) {
    category = '普通体重';
    color = 'text-green-600';
  } else if (bmi < 30) {
    category = '肥満(1度)';
    color = 'text-orange-600';
  } else {
    category = '肥満(2度以上)';
    color = 'text-red-600';
  }
  
  const resultDiv = document.getElementById('bmi-result');
  if (resultDiv) {
    resultDiv.innerHTML = `BMI: <span class="${color}">${bmi}</span><br><span class="text-xs ${color}">${category}</span>`;
  }
}

// PFC目標計算
function calculatePFCGoal() {
  const targetCalories = parseFloat(document.getElementById('target-calories')?.value || 2000);
  const goalType = document.getElementById('pfc-goal-type')?.value || 'maintain';
  
  let ratios = { protein: 0.30, fat: 0.25, carbs: 0.45 }; // デフォルト: 維持
  
  if (goalType === 'lose') {
    ratios = { protein: 0.35, fat: 0.20, carbs: 0.45 };
  } else if (goalType === 'gain') {
    ratios = { protein: 0.30, fat: 0.30, carbs: 0.40 };
  }
  
  // カロリーをグラムに変換 (P: 4kcal/g, F: 9kcal/g, C: 4kcal/g)
  const protein = Math.round((targetCalories * ratios.protein) / 4);
  const fat = Math.round((targetCalories * ratios.fat) / 9);
  const carbs = Math.round((targetCalories * ratios.carbs) / 4);
  
  const resultDiv = document.getElementById('pfc-result');
  if (resultDiv) {
    resultDiv.innerHTML = `
      <div class="mt-2 space-y-1">
        <div class="flex justify-between">
          <span>タンパク質:</span>
          <span class="font-bold text-blue-600">${protein}g</span>
        </div>
        <div class="flex justify-between">
          <span>脂質:</span>
          <span class="font-bold text-yellow-600">${fat}g</span>
        </div>
        <div class="flex justify-between">
          <span>炭水化物:</span>
          <span class="font-bold text-orange-600">${carbs}g</span>
        </div>
      </div>
    `;
  }
  
  showToast('PFC目標を計算しました', 'success');
}

// 水分補給追加
let waterIntakeToday = 0;

function addWater(amount) {
  waterIntakeToday += amount;
  updateWaterDisplay();
  showToast(`+${amount}ml 記録しました`, 'success');
}

function resetWater() {
  waterIntakeToday = 0;
  updateWaterDisplay();
  showToast('水分記録をリセットしました', 'info');
}

function updateWaterDisplay() {
  const waterIntakeEl = document.getElementById('water-intake');
  const waterProgressEl = document.getElementById('water-progress');
  const targetWater = 2000;
  
  if (waterIntakeEl) {
    waterIntakeEl.textContent = waterIntakeToday;
  }
  
  if (waterProgressEl) {
    const percentage = Math.min((waterIntakeToday / targetWater) * 100, 100);
    waterProgressEl.style.width = `${percentage}%`;
  }
}

// 目標設定を開く
function openGoalSettings() {
  showToast('目標設定機能は開発中です', 'info');
  // TODO: 目標設定モーダルを実装
}


