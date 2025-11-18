// トップページ - ファディー彦根

// 状態管理
let currentUser = null;
let currentAdvices = [];
let advices = []; // 全アドバイス（AI + スタッフ）
let unreadAdviceCount = 0; // 未読アドバイス数
let todayLog = null;
let announcements = [];
let latestStaffComment = null;
let selectedDate = null; // 選択された日付（YYYY-MM-DD形式）
let opinions = []; // 質問・相談データ
let graphPeriodOffset = 0; // グラフ表示期間のオフセット（0=現在の30日、1=その前の30日、...）
let heroChart = null; // ヒーローセクションのチャートインスタンス
let allHealthLogs = []; // 全ての健康ログデータ（グラフ用）

// 食事記録データ
let mealData = {
  breakfast: { photos: [], calories: 0, protein: 0, fat: 0, carbs: 0 },
  lunch: { photos: [], calories: 0, protein: 0, fat: 0, carbs: 0 },
  dinner: { photos: [], calories: 0, protein: 0, fat: 0, carbs: 0 }
};

// ページ初期化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('=== App Initialization Started ===');
  
  await checkAuth();
  console.log('Auth checked, currentUser:', currentUser);
  
  await loadAnnouncements();
  console.log('Announcements loaded');
  
  // 認証されている場合、データをロードしてからレンダリング
  if (currentUser) {
    selectedDate = dayjs().format('YYYY-MM-DD'); // 初期値は今日
    console.log('Loading data for date:', selectedDate);
    
    // 重要: renderPage()の前にすべてのデータをロード
    await loadAdvices();
    await loadTodayAdvices();
    await loadUnreadCount();
    await loadLogForDate(selectedDate);  // ★ ここでtodayLogとmealDataをセット
    await loadLatestStaffComment();
    await loadOpinions();
    
    console.log('All data loaded, todayLog:', todayLog);
    console.log('mealData:', mealData);
  }
  
  // データロード後にページをレンダリング
  renderPage();
  console.log('Page rendered');
  
  // ヒーロー画像スライドショー開始
  startHeroSlideshow();
  
  // グラフを描画（ログインユーザーのみ）
  if (currentUser) {
    setTimeout(() => {
      renderHeroChart();
      console.log('Hero chart rendered');
    }, 500);
  }
  
  console.log('=== App Initialization Complete ===');
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

// お知らせ読み込み
async function loadAnnouncements() {
  try {
    const response = await axios.get('/api/announcements');
    if (response.data.success) {
      announcements = response.data.data;
    }
  } catch (error) {
    console.error('お知らせの読み込みに失敗:', error);
    announcements = [];
  }
}

// アドバイス読み込み
async function loadAdvices() {
  try {
    const response = await apiCall('/api/advices');
    if (response.success) {
      currentAdvices = response.data.slice(0, 3); // 最新3件
      advices = response.data; // 全アドバイス
    }
  } catch (error) {
    console.error('アドバイスの読み込みに失敗:', error);
  }
}

// 今日のアドバイスをロード
async function loadTodayAdvices() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await apiCall(`/api/advices/by-date/${today}`);
    if (response.success) {
      // 全アドバイスリストに今日のアドバイスをマージ
      const todayAdvices = response.data;
      todayAdvices.forEach(advice => {
        if (!advices.find(a => a.id === advice.id)) {
          advices.push(advice);
        }
      });
    }
  } catch (error) {
    console.error('今日のアドバイスの読み込みに失敗:', error);
  }
}

// 未読カウントをロード
async function loadUnreadCount() {
  try {
    const response = await apiCall('/api/advices/unread-count');
    if (response.success) {
      unreadAdviceCount = response.data.count;
      updateNotificationBadge();
    }
  } catch (error) {
    console.error('未読カウントの読み込みに失敗:', error);
  }
}

// 通知バッジを更新
function updateNotificationBadge() {
  const badge = document.getElementById('advice-notification-badge');
  if (badge) {
    if (unreadAdviceCount > 0) {
      badge.textContent = unreadAdviceCount > 99 ? '99+' : unreadAdviceCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}



// ページレンダリング
function renderPage() {
  const root = document.getElementById('root');
  
  if (currentUser) {
    // ログイン後：タブ式UI
    root.innerHTML = `
      ${renderHeader()}
      ${renderMainTabs()}
      ${renderTabContents()}
      ${renderFooter()}
    `;
  } else {
    // ログイン前：従来のUI
    root.innerHTML = `
      ${renderHeader()}
      ${renderHero()}
      ${renderQuickToolsSection()}
      ${renderFeaturesSection()}
      ${renderFAQSection()}
      ${renderGymIntroSection()}
      ${renderContactSection()}
      ${renderFooter()}
    `;
  }
  
  // イベントリスナー設定
  setupEventListeners();
  
  // ダッシュボード更新
  if (currentUser) {
    updateDashboard();
    // ヒーローグラフ描画
    setTimeout(() => renderHeroChart(), 100);
  }
}

// メインタブナビゲーション
function renderMainTabs() {
  return `
    <div class="bg-white shadow-md sticky top-[60px] z-40">
      <div class="container mx-auto px-4">
        <div class="flex overflow-x-auto">
          <button type="button" 
            onclick="switchMainTab('home')" 
            id="main-tab-home"
            class="flex-shrink-0 py-4 px-6 text-sm font-bold text-center transition-all duration-200 border-b-3 border-primary bg-primary/5 text-primary whitespace-nowrap">
            <i class="fas fa-home mr-2"></i>ホーム
          </button>
          <button type="button" 
            onclick="switchMainTab('basic')" 
            id="main-tab-basic"
            class="flex-shrink-0 py-4 px-6 text-sm font-bold text-center transition-all duration-200 border-b-3 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 whitespace-nowrap">
            <i class="fas fa-heartbeat mr-2"></i>基本データ
          </button>
          <button type="button" 
            onclick="switchMainTab('meals')" 
            id="main-tab-meals"
            class="flex-shrink-0 py-4 px-6 text-sm font-bold text-center transition-all duration-200 border-b-3 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 whitespace-nowrap">
            <i class="fas fa-utensils mr-2"></i>食事記録
          </button>
          <button type="button" 
            onclick="switchMainTab('exercise')" 
            id="main-tab-exercise"
            class="flex-shrink-0 py-4 px-6 text-sm font-bold text-center transition-all duration-200 border-b-3 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 whitespace-nowrap">
            <i class="fas fa-running mr-2"></i>運動ログ
          </button>
          <button type="button" 
            onclick="switchMainTab('detailed')" 
            id="main-tab-detailed"
            class="flex-shrink-0 py-4 px-6 text-sm font-bold text-center transition-all duration-200 border-b-3 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 whitespace-nowrap">
            <i class="fas fa-clipboard-list mr-2"></i>詳細記録
          </button>
        </div>
      </div>
    </div>
  `;
}

// タブコンテンツ
function renderTabContents() {
  return `
    <!-- ホームタブ -->
    <div id="main-tab-content-home" class="main-tab-content">
      ${renderHero()}
    </div>
    
    <!-- 基本データタブ -->
    <div id="main-tab-content-basic" class="main-tab-content hidden">
      ${renderBasicDataTab()}
    </div>
    
    <!-- 食事記録タブ -->
    <div id="main-tab-content-meals" class="main-tab-content hidden">
      ${renderMealsTab()}
    </div>
    
    <!-- 運動ログタブ -->
    <div id="main-tab-content-exercise" class="main-tab-content hidden">
      ${renderExerciseTab()}
    </div>
    
    <!-- 詳細記録タブ -->
    <div id="main-tab-content-detailed" class="main-tab-content hidden">
      ${renderDetailedTab()}
    </div>
  `;
}

// 基本データタブの内容
function renderBasicDataTab() {
  return `
    <section class="bg-gradient-to-b from-gray-50/50 to-white/50 py-6 min-h-screen">
      <div class="container mx-auto px-6 md:px-8">
        <div class="max-w-4xl mx-auto">
          ${renderDateSelector()}
          ${renderStaffCommentAndAdvice()}
          
          <form id="health-log-form" class="mt-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${renderBasicHealthData()}
              ${renderConditionRating()}
            </div>
            
            <div class="mt-4 flex justify-center">
              <button type="submit" class="px-8 py-3 bg-gradient-to-r from-primary to-pink-500 text-white text-lg font-bold rounded-lg hover:shadow-lg transition-all">
                <i class="fas fa-save mr-2"></i>保存する
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `;
}

// 食事記録タブの内容
function renderMealsTab() {
  return `
    <section class="bg-gradient-to-b from-gray-50/50 to-white/50 py-6 min-h-screen">
      <div class="container mx-auto px-6 md:px-8">
        <div class="max-w-4xl mx-auto">
          ${renderDateSelector()}
          ${renderStaffCommentAndAdvice()}
          
          <form id="health-log-form" class="mt-4">
            ${renderMealSection()}
            
            <div class="mt-4 flex justify-center">
              <button type="submit" class="px-8 py-3 bg-gradient-to-r from-primary to-pink-500 text-white text-lg font-bold rounded-lg hover:shadow-lg transition-all">
                <i class="fas fa-save mr-2"></i>保存する
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `;
}

// 運動ログタブの内容
function renderExerciseTab() {
  return `
    <section class="bg-gradient-to-b from-gray-50/50 to-white/50 py-6 min-h-screen">
      <div class="container mx-auto px-6 md:px-8">
        <div class="max-w-4xl mx-auto">
          ${renderDateSelector()}
          ${renderStaffCommentAndAdvice()}
          
          <form id="health-log-form" class="mt-4">
            ${renderExerciseSection()}
            
            <div class="mt-4 flex justify-center">
              <button type="submit" class="px-8 py-3 bg-gradient-to-r from-primary to-pink-500 text-white text-lg font-bold rounded-lg hover:shadow-lg transition-all">
                <i class="fas fa-save mr-2"></i>保存する
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `;
}

// 詳細記録タブの内容
function renderDetailedTab() {
  return `
    <section class="bg-gradient-to-b from-gray-50/50 to-white/50 py-6 min-h-screen">
      <div class="container mx-auto px-6 md:px-8">
        <div class="max-w-4xl mx-auto">
          ${renderDateSelector()}
          ${renderStaffCommentAndAdvice()}
          
          <form id="health-log-form" class="mt-4">
            ${renderDetailedInputsSection()}
            
            <div class="mt-4 flex justify-center">
              <button type="submit" class="px-8 py-3 bg-gradient-to-r from-primary to-pink-500 text-white text-lg font-bold rounded-lg hover:shadow-lg transition-all">
                <i class="fas fa-save mr-2"></i>保存する
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `;
}

// 日付選択部分を抽出
function renderDateSelector() {
  return `
    <div class="mb-4">
      <div class="flex items-center justify-center gap-2">
        <button type="button" onclick="changeLogDate(-1)" class="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-primary hover:bg-primary/10 rounded-lg transition shadow-sm border border-gray-200">
          <i class="fas fa-chevron-left"></i>
        </button>
        <div class="flex items-center gap-2 bg-white px-4 py-2.5 rounded-lg shadow-md border border-gray-200">
          <i class="fas fa-calendar-alt text-primary"></i>
          <input type="date" id="log-date-picker" value="${selectedDate || dayjs().format('YYYY-MM-DD')}" 
            max="${dayjs().format('YYYY-MM-DD')}"
            onchange="changeLogDateFromPicker(this.value)"
            class="bg-transparent text-sm font-bold text-gray-700 border-none focus:outline-none cursor-pointer">
        </div>
        <button type="button" onclick="changeLogDate(1)" 
          ${selectedDate === dayjs().format('YYYY-MM-DD') ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}
          class="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-primary hover:bg-primary/10 rounded-lg transition shadow-sm border border-gray-200">
          <i class="fas fa-chevron-right"></i>
        </button>
        <button type="button" onclick="goToToday()" class="px-4 py-2.5 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90 transition shadow-sm font-bold">
          今日
        </button>
      </div>
      <p class="text-center text-gray-500 text-xs mt-2">
        <i class="fas fa-info-circle mr-1"></i>
        ${(() => {
          const displayDate = selectedDate || dayjs().format('YYYY-MM-DD');
          const isToday = displayDate === dayjs().format('YYYY-MM-DD');
          const formattedDate = dayjs(displayDate).format('YYYY年M月D日');
          return isToday ? '今日の記録を入力・編集できます' : `${formattedDate}の記録を表示中`;
        })()}
      </p>
    </div>
  `;
}

// 基本健康データセクション
function renderBasicHealthData() {
  return `
    <div id="weight-section" class="bg-white p-4 rounded-lg shadow-sm">
      <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
        <i class="fas fa-heartbeat text-primary"></i>
        基本健康データ
      </label>
      
      <!-- 体重と体脂肪率 -->
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label class="text-xs text-gray-600 mb-1 block">体重</label>
          <div class="relative">
            <input type="number" step="0.1" name="weight" id="weight-input" value="${todayLog?.weight || ''}" 
              placeholder="65.5"
              oninput="updateBMIDisplay()"
              class="w-full px-3 py-2 text-lg font-bold bg-gray-50 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition">
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">kg</span>
          </div>
        </div>
        <div>
          <label class="text-xs text-gray-600 mb-1 block">体脂肪率</label>
          <div class="relative">
            <input type="number" step="0.1" name="body_fat_percentage" id="body-fat-input-main" value="${todayLog?.body_fat_percentage || ''}" 
              placeholder="25.0"
              oninput="syncHiddenField('body-fat-input-main', 'body-fat-hidden')"
              class="w-full px-3 py-2 text-lg font-bold bg-gray-50 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition">
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">%</span>
          </div>
        </div>
      </div>
      
      <!-- BMI表示 -->
      <div class="text-center py-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg mb-3">
        <div class="text-xs text-gray-600 mb-0.5">BMI</div>
        <div class="text-xl font-bold" id="bmi-display">-</div>
      </div>
      
      <!-- 睡眠時間と運動時間 -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-gray-600 mb-1 block">睡眠時間</label>
          <div class="relative">
            <input type="number" step="0.5" name="sleep_hours" id="sleep-hours-input-main" value="${todayLog?.sleep_hours || ''}" 
              placeholder="7.5"
              oninput="syncHiddenField('sleep-hours-input-main', 'sleep-hours-hidden')"
              class="w-full px-3 py-2 text-lg font-bold bg-gray-50 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition">
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">時間</span>
          </div>
        </div>
        <div>
          <label class="text-xs text-gray-600 mb-1 block">運動時間</label>
          <div class="relative">
            <input type="number" step="5" name="exercise_minutes" id="exercise-minutes-input-main" value="${todayLog?.exercise_minutes || ''}" 
              placeholder="30"
              oninput="syncHiddenField('exercise-minutes-input-main', 'exercise-minutes-hidden')"
              class="w-full px-3 py-2 text-lg font-bold bg-gray-50 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition">
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">分</span>
          </div>
        </div>
      </div>
      
      <!-- 隠しフィールド -->
      <input type="hidden" name="body_fat_percentage" id="body-fat-hidden" value="${todayLog?.body_fat_percentage || ''}">
      <input type="hidden" name="sleep_hours" id="sleep-hours-hidden" value="${todayLog?.sleep_hours || ''}">
      <input type="hidden" name="exercise_minutes" id="exercise-minutes-hidden" value="${todayLog?.exercise_minutes || ''}">
    </div>
  `;
}

// 体調評価セクション
function renderConditionRating() {
  return `
    <div class="bg-white p-4 rounded-lg shadow-sm">
      <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
        <i class="fas fa-smile text-primary"></i>
        今日の体調
      </label>
      <div class="flex items-center justify-between gap-2">
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
              <div class="flex flex-col items-center p-3 rounded-lg transition ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'}" id="condition-rating-label-${rating}">
                <i class="fas ${icons[rating-1]} text-3xl ${isSelected ? colors[rating-1] : 'text-gray-300'} mb-2" id="condition-rating-icon-${rating}"></i>
                <span class="text-sm ${isSelected ? 'text-gray-700 font-bold' : 'text-gray-400'}" id="condition-rating-text-${rating}">${labels[rating-1]}</span>
              </div>
            </label>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// 食事記録セクション (完全実装)
function renderMealSection() {
  return `
    <div id="meal-section" class="bg-white p-4 rounded-lg shadow-sm">
      <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
        <i class="fas fa-utensils text-accent"></i>
        食事記録
      </label>
      
      <!-- 3食 -->
      <div class="space-y-3">
        <!-- 朝食 -->
        <div class="bg-gradient-to-br from-yellow-50 to-orange-50 p-3 rounded-lg">
          <div class="flex items-center gap-2 mb-2">
            <div class="text-sm font-bold text-gray-700 whitespace-nowrap">
              <i class="fas fa-sun text-yellow-500"></i> 朝食
            </div>
            <input type="number" id="breakfast-calories" value="${mealData?.breakfast?.calories || 0}"
              oninput="updateMealNutrition('breakfast', 'calories', this.value)"
              placeholder="0"
              class="flex-1 px-3 py-2 bg-white text-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-center text-base font-bold min-w-0">
            <span class="text-sm text-gray-500 whitespace-nowrap">kcal</span>
            <button type="button" onclick="showMealModal('breakfast')" 
              class="px-3 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition whitespace-nowrap flex-shrink-0">
              <i class="fas fa-camera mr-1"></i>撮影
            </button>
          </div>
          
          <!-- PFC入力 (折りたたみ) -->
          <button type="button" onclick="toggleMealPFC('breakfast')" 
            class="w-full text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center gap-1 py-1 mb-1">
            <i class="fas fa-plus-circle"></i>
            <span>PFC詳細</span>
            <i class="fas fa-chevron-down text-xs" id="breakfast-pfc-arrow"></i>
          </button>
          
          <div id="breakfast-pfc" class="hidden grid grid-cols-3 gap-2 mt-2">
            <div>
              <input type="number" step="0.1" id="breakfast-protein" value="${mealData?.breakfast?.protein || 0}"
                oninput="updateMealNutrition('breakfast', 'protein', this.value)"
                placeholder="P"
                class="w-full px-2 py-2 bg-white text-gray-800 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
              <div class="text-xs text-gray-500 text-center mt-1">たんぱく質(g)</div>
            </div>
            <div>
              <input type="number" step="0.1" id="breakfast-fat" value="${mealData?.breakfast?.fat || 0}"
                oninput="updateMealNutrition('breakfast', 'fat', this.value)"
                placeholder="F"
                class="w-full px-2 py-2 bg-white text-gray-800 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
              <div class="text-xs text-gray-500 text-center mt-1">脂質(g)</div>
            </div>
            <div>
              <input type="number" step="0.1" id="breakfast-carbs" value="${mealData?.breakfast?.carbs || 0}"
                oninput="updateMealNutrition('breakfast', 'carbs', this.value)"
                placeholder="C"
                class="w-full px-2 py-2 bg-white text-gray-800 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
              <div class="text-xs text-gray-500 text-center mt-1">炭水化物(g)</div>
            </div>
          </div>
          
          <div id="breakfast-photos" class="mt-2 text-sm text-gray-600 text-center"></div>
        </div>
        
        <!-- 昼食 -->
        <div class="bg-gradient-to-br from-orange-50 to-red-50 p-3 rounded-lg">
          <div class="flex items-center gap-2 mb-2">
            <div class="text-sm font-bold text-gray-700 whitespace-nowrap">
              <i class="fas fa-cloud-sun text-orange-500"></i> 昼食
            </div>
            <input type="number" id="lunch-calories" value="${mealData?.lunch?.calories || 0}"
              oninput="updateMealNutrition('lunch', 'calories', this.value)"
              placeholder="0"
              class="flex-1 px-3 py-2 bg-white text-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-center text-base font-bold min-w-0">
            <span class="text-sm text-gray-500 whitespace-nowrap">kcal</span>
            <button type="button" onclick="showMealModal('lunch')" 
              class="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition whitespace-nowrap flex-shrink-0">
              <i class="fas fa-camera mr-1"></i>撮影
            </button>
          </div>
          
          <!-- PFC入力 (折りたたみ) -->
          <button type="button" onclick="toggleMealPFC('lunch')" 
            class="w-full text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center gap-1 py-1 mb-1">
            <i class="fas fa-plus-circle"></i>
            <span>PFC詳細</span>
            <i class="fas fa-chevron-down text-xs" id="lunch-pfc-arrow"></i>
          </button>
          
          <div id="lunch-pfc" class="hidden grid grid-cols-3 gap-2 mt-2">
            <div>
              <input type="number" step="0.1" id="lunch-protein" value="${mealData?.lunch?.protein || 0}"
                oninput="updateMealNutrition('lunch', 'protein', this.value)"
                placeholder="P"
                class="w-full px-2 py-2 bg-white text-gray-800 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              <div class="text-xs text-gray-500 text-center mt-1">たんぱく質(g)</div>
            </div>
            <div>
              <input type="number" step="0.1" id="lunch-fat" value="${mealData?.lunch?.fat || 0}"
                oninput="updateMealNutrition('lunch', 'fat', this.value)"
                placeholder="F"
                class="w-full px-2 py-2 bg-white text-gray-800 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              <div class="text-xs text-gray-500 text-center mt-1">脂質(g)</div>
            </div>
            <div>
              <input type="number" step="0.1" id="lunch-carbs" value="${mealData?.lunch?.carbs || 0}"
                oninput="updateMealNutrition('lunch', 'carbs', this.value)"
                placeholder="C"
                class="w-full px-2 py-2 bg-white text-gray-800 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              <div class="text-xs text-gray-500 text-center mt-1">炭水化物(g)</div>
            </div>
          </div>
          
          <div id="lunch-photos" class="mt-2 text-sm text-gray-600 text-center"></div>
        </div>
        
        <!-- 夕食 -->
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-lg">
          <div class="flex items-center gap-2 mb-2">
            <div class="text-sm font-bold text-gray-700 whitespace-nowrap">
              <i class="fas fa-moon text-blue-500"></i> 夕食
            </div>
            <input type="number" id="dinner-calories" value="${mealData?.dinner?.calories || 0}"
              oninput="updateMealNutrition('dinner', 'calories', this.value)"
              placeholder="0"
              class="flex-1 px-3 py-2 bg-white text-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-base font-bold min-w-0">
            <span class="text-sm text-gray-500 whitespace-nowrap">kcal</span>
            <button type="button" onclick="showMealModal('dinner')" 
              class="px-3 py-2 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600 transition whitespace-nowrap flex-shrink-0">
              <i class="fas fa-camera mr-1"></i>撮影
            </button>
          </div>
          
          <!-- PFC入力 (折りたたみ) -->
          <button type="button" onclick="toggleMealPFC('dinner')" 
            class="w-full text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center gap-1 py-1 mb-1">
            <i class="fas fa-plus-circle"></i>
            <span>PFC詳細</span>
            <i class="fas fa-chevron-down text-xs" id="dinner-pfc-arrow"></i>
          </button>
          
          <div id="dinner-pfc" class="hidden grid grid-cols-3 gap-2 mt-2">
            <div>
              <input type="number" step="0.1" id="dinner-protein" value="${mealData?.dinner?.protein || 0}"
                oninput="updateMealNutrition('dinner', 'protein', this.value)"
                placeholder="P"
                class="w-full px-2 py-2 bg-white text-gray-800 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <div class="text-xs text-gray-500 text-center mt-1">たんぱく質(g)</div>
            </div>
            <div>
              <input type="number" step="0.1" id="dinner-fat" value="${mealData?.dinner?.fat || 0}"
                oninput="updateMealNutrition('dinner', 'fat', this.value)"
                placeholder="F"
                class="w-full px-2 py-2 bg-white text-gray-800 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <div class="text-xs text-gray-500 text-center mt-1">脂質(g)</div>
            </div>
            <div>
              <input type="number" step="0.1" id="dinner-carbs" value="${mealData?.dinner?.carbs || 0}"
                oninput="updateMealNutrition('dinner', 'carbs', this.value)"
                placeholder="C"
                class="w-full px-2 py-2 bg-white text-gray-800 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <div class="text-xs text-gray-500 text-center mt-1">炭水化物(g)</div>
            </div>
          </div>
          
          <div id="dinner-photos" class="mt-2 text-sm text-gray-600 text-center"></div>
        </div>
      </div>
        
      <!-- 合計 -->
      <div class="mt-4 bg-gradient-to-br from-primary/10 to-pink-50 p-4 rounded-lg">
        <div class="text-center">
          <div class="text-sm text-gray-600 mb-2">今日の総カロリー</div>
          <div class="flex items-center justify-center gap-2">
            <input type="number" 
              id="total-calories-input"
              value="0"
              oninput="updateTotalCaloriesDisplay()"
              class="w-32 px-3 py-2 text-2xl font-bold text-primary text-center bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <span class="text-base text-gray-500">kcal</span>
          </div>
          <div class="text-sm text-gray-500 mt-2">
            <span id="total-calories-breakdown">朝0 + 昼0 + 夕0</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 運動ログセクション (完全実装)
function renderExerciseSection() {
  return `
    <div id="exercise-section" class="bg-white p-4 rounded-lg shadow-sm">
      <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-4">
        <i class="fas fa-running text-primary"></i>
        運動ログ
      </label>
        
      <div id="exercise-tracker">
        <!-- 運動サマリー -->
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="bg-blue-50 p-3 rounded-lg text-center">
            <div class="text-sm text-gray-600 mb-1">合計時間</div>
            <div class="text-2xl font-bold text-blue-600" id="total-exercise-time">0</div>
            <div class="text-sm text-gray-500">分</div>
          </div>
          <div class="bg-orange-50 p-3 rounded-lg text-center">
            <div class="text-sm text-gray-600 mb-1">消費カロリー</div>
            <div class="text-2xl font-bold text-orange-600" id="total-exercise-calories">0</div>
            <div class="text-sm text-gray-500">kcal</div>
          </div>
        </div>
        
        <!-- 運動種目リスト -->
        <div class="space-y-2">
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
            <div class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition">
              <button type="button" 
                onclick="toggleExercise('${ex.id}')"
                id="exercise-toggle-${ex.id}"
                class="w-14 h-8 bg-gray-200 rounded-full relative transition-all duration-300 flex-shrink-0"
                data-active="false">
                <div class="absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow transition-all duration-300"></div>
              </button>
              <i class="fas ${ex.icon} text-${ex.color}-500 text-lg flex-shrink-0"></i>
              <span class="text-sm font-medium text-gray-700 flex-1 min-w-0">${ex.name}</span>
              <input type="number" 
                id="exercise-time-${ex.id}"
                value="${ex.time}"
                onchange="updateExerciseSummary()"
                class="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary">
              <span class="text-sm text-gray-500 whitespace-nowrap">分</span>
              <span class="text-sm text-gray-400 whitespace-nowrap w-16 text-right" id="exercise-cal-${ex.id}">0kcal</span>
            </div>
          `).join('')}
        </div>
        
        <!-- 運動メモ -->
        <div class="mt-4">
          <label class="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
            <i class="fas fa-pencil-alt text-primary"></i>
            運動メモ
          </label>
          <textarea id="condition-note-input" rows="3" 
            placeholder="例：ジムでベンチプレス60kg × 10回 × 3セット"
            oninput="syncHiddenField('condition-note-input', 'condition-note-hidden')"
            class="w-full px-4 py-3 text-sm bg-gray-50 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
          >${todayLog?.condition_note || ''}</textarea>
        </div>
        
        <input type="hidden" name="condition_note" id="condition-note-hidden" value="${todayLog?.condition_note || ''}">
      </div>
    </div>
  `;
}

// 詳細記録セクション (完全実装)
function renderDetailedInputsSection() {
  return `
    <div class="bg-white p-4 rounded-lg shadow-sm">
      <div id="detailed-inputs" class="space-y-6">
        <!-- その他の記録 -->
        <div class="pb-4 border-b border-gray-200">
          <h4 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <i class="fas fa-clipboard-list text-primary"></i>
            その他の記録
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- 体温 -->
            <div>
              <label class="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                <i class="fas fa-thermometer-half text-primary"></i>
                体温
              </label>
              <div class="relative">
                <input type="number" step="0.1" name="body_temperature" value="${todayLog?.body_temperature || ''}"
                  placeholder="36.5"
                  class="w-full px-4 py-3 text-base bg-gray-50 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition">
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">°C</span>
              </div>
            </div>
            
            <!-- 水分摂取 -->
            <div>
              <label class="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                <i class="fas fa-tint text-primary"></i>
                水分摂取量
              </label>
              <div class="relative">
                <input type="number" step="100" name="water_intake" value="${todayLog?.water_intake || ''}"
                  placeholder="2000"
                  class="w-full px-4 py-3 text-base bg-gray-50 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition">
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">ml</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 便利ツール -->
        <div>
          <h4 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <i class="fas fa-magic text-primary"></i>
            便利ツール
          </h4>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- BMI計算 -->
            <div class="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg">
              <h5 class="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <i class="fas fa-calculator text-purple-500"></i>
                BMI計算
              </h5>
              <div class="space-y-2">
                <div>
                  <label class="text-xs text-gray-600 block mb-1">身長 (cm)</label>
                  <input type="number" id="bmi-height" value="${currentUser?.height || ''}" step="0.1"
                    class="w-full px-3 py-2 text-sm border border-purple-200 rounded focus:outline-none focus:ring-2 focus:ring-primary">
                </div>
                <div>
                  <label class="text-xs text-gray-600 block mb-1">体重 (kg)</label>
                  <input type="number" id="bmi-weight" value="${todayLog?.weight || ''}" step="0.1"
                    class="w-full px-3 py-2 text-sm border border-purple-200 rounded focus:outline-none focus:ring-2 focus:ring-primary">
                </div>
                <button type="button" onclick="calculateBMI()" 
                  class="w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition text-sm font-medium">
                  <i class="fas fa-calculator mr-1"></i>計算
                </button>
                <div id="bmi-result" class="text-center text-sm font-bold text-purple-600"></div>
              </div>
            </div>
            
            <!-- PFC目標計算 -->
            <div class="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-lg">
              <h5 class="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <i class="fas fa-balance-scale text-indigo-500"></i>
                PFC目標計算
              </h5>
              <div class="space-y-2">
                <div>
                  <label class="text-xs text-gray-600 block mb-1">目標カロリー</label>
                  <input type="number" id="target-calories" value="2000" 
                    class="w-full px-3 py-2 text-sm border border-indigo-200 rounded focus:outline-none focus:ring-2 focus:ring-primary">
                </div>
                <div>
                  <label class="text-xs text-gray-600 block mb-1">目標タイプ</label>
                  <select id="pfc-goal-type" 
                    class="w-full px-3 py-2 text-sm border border-indigo-200 rounded focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="maintain">維持 (P:30% F:25% C:45%)</option>
                    <option value="lose">減量 (P:35% F:20% C:45%)</option>
                    <option value="gain">増量 (P:30% F:30% C:40%)</option>
                  </select>
                </div>
                <button type="button" onclick="calculatePFCGoal()" 
                  class="w-full px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition text-sm font-medium">
                  <i class="fas fa-chart-pie mr-1"></i>計算
                </button>
                <div id="pfc-result" class="text-xs text-gray-700"></div>
              </div>
            </div>
            
            <!-- 水分補給リマインダー -->
            <div class="bg-gradient-to-br from-cyan-50 to-teal-50 p-4 rounded-lg">
              <h5 class="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <i class="fas fa-tint text-cyan-500"></i>
                水分補給
              </h5>
              <div class="space-y-2">
                <div class="bg-white p-3 rounded">
                  <div class="text-xs text-gray-600 mb-1">今日の水分</div>
                  <div class="flex items-center justify-between">
                    <span class="text-2xl font-bold text-cyan-600" id="water-intake">0</span>
                    <span class="text-sm text-gray-500">/ 2000 ml</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div id="water-progress" class="bg-cyan-500 h-full rounded-full transition-all" style="width: 0%"></div>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <button type="button" onclick="addWater(200)" 
                    class="px-3 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition text-sm">
                    +200ml
                  </button>
                  <button type="button" onclick="addWater(500)" 
                    class="px-3 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition text-sm">
                    +500ml
                  </button>
                </div>
                <button type="button" onclick="resetWater()" 
                  class="w-full px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition text-sm">
                  <i class="fas fa-redo mr-1"></i>リセット
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// スタッフコメントとアドバイス部分を抽出
function renderStaffCommentAndAdvice() {
  const displayDate = selectedDate || dayjs().format('YYYY-MM-DD');
  const dateAdvices = advices.filter(a => a.log_date === displayDate);
  const aiAdvices = dateAdvices.filter(a => a.advice_source === 'ai');
  const staffAdvices = dateAdvices.filter(a => a.advice_source === 'staff');
  
  return `
    ${latestStaffComment ? `
      <div class="mb-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg shadow-sm">
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
    
    ${staffAdvices.length > 0 || aiAdvices.length > 0 ? `
      <div class="mb-3">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-base font-bold text-gray-800 flex items-center gap-2">
            <i class="fas fa-lightbulb text-yellow-500"></i>
            この日のアドバイス
          </h3>
          <a href="/mypage#advices-section" class="text-sm text-primary hover:text-pink-600">
            すべて見る →
          </a>
        </div>
        
        <div class="bg-white/30 backdrop-blur-xl p-4 rounded-xl border border-white/40 shadow-sm">
          <div class="space-y-2">
            ${staffAdvices.map(advice => `
              <div class="bg-white/50 backdrop-blur-sm p-3 rounded-lg border border-white/30">
                <div class="flex items-center gap-2 mb-2">
                  <div class="w-7 h-7 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-user-nurse text-white text-xs"></i>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-pink-600">スタッフ</span>
                    ${advice.staff_name ? `<span class="text-xs text-gray-500">- ${advice.staff_name}</span>` : ''}
                  </div>
                </div>
                <strong class="text-sm font-bold text-gray-800 block mb-1">${advice.title}</strong>
                <p class="text-xs text-gray-600">${advice.content}</p>
              </div>
            `).join('')}
            ${aiAdvices.map(advice => `
              <div class="bg-white/50 backdrop-blur-sm p-3 rounded-lg border border-white/30">
                <div class="flex items-center gap-2 mb-2">
                  <div class="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-robot text-white text-xs"></i>
                  </div>
                  <span class="text-xs font-bold text-blue-600">AI</span>
                </div>
                <strong class="text-sm font-bold text-gray-800 block mb-1">${advice.title}</strong>
                <p class="text-xs text-gray-600">${advice.content}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    ` : ''}
  `;
}

// 共通ヘッダー
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
            ${currentUser ? `
              <div class="flex items-center gap-2">
                <span class="hidden sm:flex items-center gap-1.5 text-xs text-gray-700">
                  <i class="fas fa-user-circle text-primary text-sm"></i>
                  <span class="font-medium">${currentUser.name}さん</span>
                </span>
                <a href="/mypage" class="relative px-2.5 py-1.5 text-xs text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition">
                  <i class="fas fa-chart-line mr-1"></i>
                  マイデータ
                  <span id="advice-notification-badge" class="hidden absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center text-[10px]">0</span>
                </a>
                ${currentUser.role === 'admin' ? `
                  <a href="/admin" class="px-2.5 py-1.5 text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 rounded-lg transition shadow-sm">
                    <i class="fas fa-user-shield mr-1"></i>
                    管理画面
                  </a>
                ` : ''}
                <button onclick="logout()" class="px-2.5 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition">
                  ログアウト
                </button>
              </div>
            ` : `
              <button onclick="showLoginModal()" class="px-4 py-1.5 text-sm bg-primary text-white hover:bg-opacity-90 rounded-lg transition shadow-sm">
                <i class="fas fa-sign-in-alt mr-1.5"></i>
                <span>ログイン</span>
              </button>
            `}
          </nav>
        </div>
      </div>
    </header>
  `;
}

// ファディー彦根ジムの画像配列（3枚）
const gymImages = [
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&h=1080&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&h=1080&fit=crop&q=80'
];

let currentImageIndex = 0;

// Hero セクション - ファディージム画像スライドショー
function renderHero() {
  return `
    <section class="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
      <!-- 背景画像スライドショー（3枚） -->
      <div class="absolute inset-0" id="hero-slideshow">
        ${gymImages.map((img, index) => `
          <img src="${img}" 
               alt="フィットネス背景 ${index + 1}" 
               class="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${index === 0 ? 'opacity-100' : 'opacity-0'}"
               id="hero-image-${index}">
        `).join('')}
        <div class="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60"></div>
      </div>
      
      <div class="container mx-auto px-6 md:px-8 relative z-10">
        <div class="max-w-6xl mx-auto">
          ${currentUser ? `
            <!-- ログイン後：名前表示（モダンUI） -->
            <div class="text-center mb-8 mt-8">
              <div class="inline-flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-lg hover:bg-white/15 transition-all">
                <div class="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <i class="fas fa-user text-white text-lg"></i>
                </div>
                <h1 class="text-xl md:text-2xl font-bold text-white" 
                    style="text-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                  ${currentUser.name}<span class="text-lg md:text-xl ml-1 font-normal">さん</span>
                </h1>
              </div>
            </div>
            
            <!-- お知らせ（2件表示） -->
            ${announcements.length > 0 ? `
              <div class="mb-6">
                <div class="bg-white/20 backdrop-blur-md rounded-xl p-4 shadow-lg">
                  <div class="flex items-center justify-between mb-3">
                    <h3 class="text-base font-bold text-white flex items-center gap-2">
                      <i class="fas fa-bell"></i>
                      お知らせ
                    </h3>
                    ${announcements.length > 2 ? `
                      <button onclick="showAllAnnouncements()" 
                        class="text-sm text-white/90 hover:text-white font-medium transition-all hover:underline flex items-center gap-1">
                        もっと見る
                        <i class="fas fa-chevron-right text-xs"></i>
                      </button>
                    ` : ''}
                  </div>
                  <div class="space-y-2">
                    ${announcements.slice(0, 2).map(announcement => `
                      <div class="bg-white/20 backdrop-blur-sm rounded-lg p-3 hover:bg-white/30 transition-all cursor-pointer"
                           onclick="showAnnouncementDetail(${announcement.id})">
                        <div class="flex gap-3 items-center">
                          ${announcement.image_url ? `
                            <img src="${announcement.image_url}" alt="${announcement.title}" 
                              class="w-12 h-12 object-cover rounded-lg flex-shrink-0">
                          ` : `
                            <div class="w-12 h-12 bg-gradient-to-br from-primary to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                              <i class="fas fa-bullhorn text-white text-base"></i>
                            </div>
                          `}
                          <div class="flex-1 min-w-0">
                            <h4 class="text-sm font-bold text-white mb-1">${announcement.title}</h4>
                            <p class="text-xs text-white/80 line-clamp-2">${announcement.content}</p>
                          </div>
                          <i class="fas fa-chevron-right text-white/60 text-sm flex-shrink-0"></i>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            ` : ''}
            
            <!-- 健康データグラフ（30日単位） -->
            <div class="mb-6 bg-white/85 backdrop-blur-sm rounded-xl p-3 shadow-lg">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    <i class="fas fa-chart-line" style="color: var(--color-primary);"></i>
                    健康データ推移
                  </h3>
                  <div class="flex items-center gap-1">
                    <button onclick="navigateGraphPeriod(-1)" 
                      class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-600 hover:text-gray-800 text-sm"
                      id="graph-prev-btn">
                      <i class="fas fa-chevron-left"></i>
                    </button>
                    <span class="text-xs text-gray-500 min-w-[120px] text-center" id="graph-period-label">最新30日</span>
                    <button onclick="navigateGraphPeriod(1)" 
                      class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-600 hover:text-gray-800 text-sm"
                      id="graph-next-btn"
                      ${graphPeriodOffset === 0 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}>
                      <i class="fas fa-chevron-right"></i>
                    </button>
                  </div>
                </div>
                <div class="bg-white rounded-lg p-2">
                  <div style="height: 200px;">
                    <canvas id="hero-chart"></canvas>
                  </div>
                </div>
                <!-- 凡例 -->
                <div class="flex flex-wrap justify-center gap-2 mt-2">
                  <div class="flex items-center gap-1">
                    <div class="w-3 h-3 rounded" style="background-color: #3b82f6;"></div>
                    <span class="text-xs">体重</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <div class="w-3 h-3 rounded" style="background-color: #ef4444;"></div>
                    <span class="text-xs">体脂肪率</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <div class="w-3 h-3 rounded" style="background-color: #8b5cf6;"></div>
                    <span class="text-xs">睡眠時間</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <div class="w-3 h-3 rounded" style="background-color: #10b981;"></div>
                    <span class="text-xs">カロリー (÷100)</span>
                  </div>
                </div>
              </div>
            </div>
          ` : `
            <!-- ログイン前 -->
            <div class="text-center">
              <h1 class="text-5xl md:text-6xl font-bold mb-4 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
                ファディ健康ログ
              </h1>
              <p class="text-xl text-white/90 mb-8 drop-shadow-lg">AI × プロトレーナーで理想の健康を</p>
              <div class="flex justify-center gap-8">
                <div class="text-center">
                  <div class="w-16 h-16 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-2 mx-auto">
                    <div class="text-3xl">🤖</div>
                  </div>
                  <p class="text-sm text-white/90 drop-shadow">AI分析</p>
                </div>
                <div class="text-center">
                  <div class="w-16 h-16 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-2 mx-auto">
                    <div class="text-3xl">👨‍⚕️</div>
                  </div>
                  <p class="text-sm text-white/90 drop-shadow">プロ指導</p>
                </div>
                <div class="text-center">
                  <div class="w-16 h-16 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-2 mx-auto">
                    <div class="text-3xl">📊</div>
                  </div>
                  <p class="text-sm text-white/90 drop-shadow">データ分析</p>
                </div>
              </div>
            </div>
          `}
        </div>
      </div>
    </section>
    
    <style>
      @keyframes fade-in {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes float {
        0%, 100% {
          transform: translateY(0) translateX(0);
        }
        50% {
          transform: translateY(-20px) translateX(10px);
        }
      }
      
      .animate-fade-in {
        animation: fade-in 1s ease-out;
      }
      
      .animate-float {
        animation: float 6s ease-in-out infinite;
      }
      
      .animate-float-delay-1 {
        animation: float 7s ease-in-out infinite;
        animation-delay: 1s;
      }
      
      .animate-float-delay-2 {
        animation: float 8s ease-in-out infinite;
        animation-delay: 2s;
      }
      
      .animate-float-delay-3 {
        animation: float 9s ease-in-out infinite;
        animation-delay: 3s;
      }
    </style>
  `;
}

// アドバイスセクション
// 健康ログ入力セクション
function renderHealthLogSection() {
  return `
    <section id="health-log-section" class="bg-gradient-to-b from-gray-50/50 to-white/50 py-4">
      <div class="container mx-auto px-6 md:px-8">
        <div class="max-w-6xl mx-auto">
          
          <!-- タイトル -->
          <div class="mb-2">
            <div class="text-center mb-2">
              <h3 class="text-xl font-bold text-gray-800">
                <i class="fas fa-edit mr-2" style="color: var(--color-primary)"></i>
                ${(() => {
                  const displayDate = selectedDate || dayjs().format('YYYY-MM-DD');
                  const isToday = displayDate === dayjs().format('YYYY-MM-DD');
                  const formattedDate = dayjs(displayDate).format('YYYY年M月D日');
                  return isToday ? '今日の健康ログ' : `${formattedDate}の健康ログ`;
                })()}
              </h3>
            </div>
          </div>
          

          
          <!-- スタッフコメント -->
          ${latestStaffComment ? `
            <div class="mb-2 bg-gradient-to-r from-blue-50 to-indigo-50 p-2 rounded-lg shadow-sm">
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
          

          <!-- この日のアドバイス（クールデザイン） -->
          ${(() => {
            const displayDate = selectedDate || dayjs().format('YYYY-MM-DD');
            const dateAdvices = advices.filter(a => a.log_date === displayDate);
            const aiAdvices = dateAdvices.filter(a => a.advice_source === 'ai');
            const staffAdvices = dateAdvices.filter(a => a.advice_source === 'staff');
            
            return `
              <div class="mb-4">
                <div class="flex justify-between items-center mb-3">
                  <h3 class="text-base font-bold text-gray-800 flex items-center gap-2">
                    <i class="fas fa-lightbulb text-yellow-500"></i>
                    この日のアドバイス
                  </h3>
                  <a href="/mypage#advices-section" class="text-sm text-primary hover:text-pink-600">
                    すべて見る →
                  </a>
                </div>
                
                <!-- 統合アドバイス（スタッフ優先） -->
                <div class="bg-white/30 backdrop-blur-xl p-4 rounded-xl hover:bg-white/40 transition-all border border-white/40 shadow-[0_4px_16px_0_rgba(31,38,135,0.2)]">
                  ${staffAdvices.length > 0 || aiAdvices.length > 0 ? `
                    <div class="space-y-2">
                      ${staffAdvices.map(advice => `
                        <div class="bg-white/50 backdrop-blur-sm p-3 rounded-lg border border-white/30">
                          <div class="flex items-center gap-2 mb-2">
                            <div class="w-7 h-7 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <i class="fas fa-user-nurse text-white text-xs"></i>
                            </div>
                            <div class="flex items-center gap-2">
                              <span class="text-xs font-bold text-pink-600">スタッフ</span>
                              ${advice.staff_name ? `<span class="text-xs text-gray-500">- ${advice.staff_name}</span>` : ''}
                            </div>
                          </div>
                          <strong class="text-sm font-bold text-gray-800 block mb-1">${advice.title}</strong>
                          <p class="text-xs text-gray-600">${advice.content}</p>
                        </div>
                      `).join('')}
                      ${aiAdvices.map(advice => `
                        <div class="bg-white/50 backdrop-blur-sm p-3 rounded-lg border border-white/30">
                          <div class="flex items-center gap-2 mb-2">
                            <div class="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <i class="fas fa-robot text-white text-xs"></i>
                            </div>
                            <span class="text-xs font-bold text-blue-600">AI</span>
                          </div>
                          <strong class="text-sm font-bold text-gray-800 block mb-1">${advice.title}</strong>
                          <p class="text-xs text-gray-600">${advice.content}</p>
                        </div>
                      `).join('')}
                    </div>
                  ` : `
                    <div class="bg-white/50 backdrop-blur-sm p-3 rounded-lg text-center border border-white/30">
                      <p class="text-xs text-gray-400">まだアドバイスがありません</p>
                    </div>
                  `}
                </div>
              </div>
            `;
          })()}
          
          <!-- 入力エリア開始の明示 -->
          <div class="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200 shadow-sm">
            <div class="flex items-center justify-center gap-2">
              <i class="fas fa-edit text-green-600 text-xl"></i>
              <h3 class="text-lg font-bold text-green-800">ここから記録を入力してください</h3>
              <i class="fas fa-arrow-down text-green-600 animate-bounce"></i>
            </div>
            <p class="text-sm text-center text-green-700 mt-1">体重・食事・運動・体調を記録しましょう</p>
          </div>
          
          <!-- 入力フォーム -->
          <form id="health-log-form" class="space-y-2">
            
            <!-- 体重と体調（横並び） -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <!-- 基本健康データ -->
              <div id="weight-section" class="bg-white p-3 rounded-lg shadow-sm">
                <label class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                  <i class="fas fa-heartbeat text-primary"></i>
                  基本健康データ
                </label>
                
                <!-- 体重と体脂肪率 -->
                <div class="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label class="text-xs text-gray-600 mb-1 block">体重</label>
                    <div class="relative">
                      <input type="number" step="0.1" name="weight" id="weight-input" value="${todayLog?.weight || ''}" 
                        placeholder="65.5"
                        oninput="updateBMIDisplay()"
                        class="w-full px-3 py-2 text-lg font-bold bg-gray-50 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition">
                      <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">kg</span>
                    </div>
                  </div>
                  <div>
                    <label class="text-xs text-gray-600 mb-1 block">体脂肪率</label>
                    <div class="relative">
                      <input type="number" step="0.1" name="body_fat_percentage" id="body-fat-input-main" value="${todayLog?.body_fat_percentage || ''}" 
                        placeholder="25.0"
                        oninput="syncHiddenField('body-fat-input-main', 'body-fat-hidden')"
                        class="w-full px-3 py-2 text-lg font-bold bg-gray-50 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition">
                      <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">%</span>
                    </div>
                  </div>
                </div>
                
                <!-- BMI表示 -->
                <div class="text-center py-2 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg mb-3">
                  <div class="text-xs text-gray-600 mb-0.5">BMI</div>
                  <div class="text-lg font-bold" id="bmi-display">-</div>
                </div>
                
                <!-- 睡眠時間と運動時間 -->
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-xs text-gray-600 mb-1 block">睡眠時間</label>
                    <div class="relative">
                      <input type="number" step="0.5" name="sleep_hours" id="sleep-hours-input-main" value="${todayLog?.sleep_hours || ''}" 
                        placeholder="7.5"
                        oninput="syncHiddenField('sleep-hours-input-main', 'sleep-hours-hidden')"
                        class="w-full px-3 py-2 text-lg font-bold bg-gray-50 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition">
                      <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">時間</span>
                    </div>
                  </div>
                  <div>
                    <label class="text-xs text-gray-600 mb-1 block">運動時間</label>
                    <div class="relative">
                      <input type="number" step="5" name="exercise_minutes" id="exercise-minutes-input-main" value="${todayLog?.exercise_minutes || ''}" 
                        placeholder="30"
                        oninput="syncHiddenField('exercise-minutes-input-main', 'exercise-minutes-hidden')"
                        class="w-full px-3 py-2 text-lg font-bold bg-gray-50 text-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition">
                      <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">分</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 体調 -->
              <div class="bg-white p-2 rounded-lg shadow-sm">
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
            <div id="meal-section" class="bg-white p-2 rounded-lg shadow-sm">
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
          </form>
          
          <!-- 運動ログ（フォーム外・独立） -->
          <div id="exercise-section" class="mt-2">
            <div class="bg-white p-2 rounded-lg shadow-sm">
              <button type="button" onclick="toggleExerciseTracker()" 
                class="w-full flex items-center justify-between text-left group">
                <label class="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                  <i class="fas fa-running text-primary group-hover:text-pink-500 transition"></i>
                  運動ログ
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
            
            <!-- 詳細ログ（折りたたみ） -->
            <div class="mt-2 bg-white p-2 rounded-lg shadow-sm">
              <button type="button" onclick="toggleDetailedInputs()" 
                class="w-full flex items-center justify-between text-left group">
                <label class="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                  <i class="fas fa-clipboard-list text-primary group-hover:text-pink-500 transition"></i>
                  詳細ログ
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
          
          <!-- 質問・相談 (アコーディオン) -->
          ${(() => {
            const answeredOpinions = opinions.filter(op => op.status === 'answered');
            const hasAnswers = answeredOpinions.length > 0;
            
            return `
              <div class="mt-2 bg-white p-2 rounded-lg shadow-sm">
                <button type="button" onclick="toggleOpinionBox()" 
                  class="w-full flex items-center justify-between text-left group">
                  <label class="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                    <i class="fas fa-comments text-primary group-hover:text-pink-500 transition"></i>
                    質問・相談
                    ${hasAnswers ? '<span class="text-xs text-green-600 ml-1">(回答 ' + answeredOpinions.length + '件)</span>' : ''}
                  </label>
                  <i class="fas fa-chevron-down text-gray-400 transform transition-transform text-sm ${hasAnswers ? 'rotate-180' : ''}" id="opinion-box-arrow"></i>
                </button>
                
                <div id="opinion-box" class="mt-2 ${hasAnswers ? '' : 'hidden'}">
                  <div class="bg-gradient-to-br from-purple-50 to-pink-50 p-2 rounded-lg">
                    <textarea 
                      id="question-input" 
                      rows="2" 
                      class="w-full px-2 py-2 text-sm bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition mb-2"
                      placeholder="トレーニングや食事に関する質問をどうぞ..."
                    ></textarea>
                    
                    <div class="flex items-center justify-between">
                      <a href="/mypage#qa-section" class="text-xs text-primary hover:underline">
                        <i class="fas fa-history mr-1"></i>
                        過去の質問
                      </a>
                      <button 
                        onclick="submitQuestion()" 
                        class="px-2 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-opacity-90 transition shadow-sm font-medium"
                      >
                        <i class="fas fa-paper-plane mr-1"></i>
                        送信
                      </button>
                    </div>
                  </div>
                  
                  <!-- 回答済みの質問を表示 -->
                  ${hasAnswers ? `
                    <div class="mt-2 space-y-2">
                      ${answeredOpinions.slice(0, 2).map(opinion => `
                        <div class="bg-white p-2 rounded-lg border-l-2 border-green-500">
                          <div class="text-xs text-gray-600 mb-1">
                            <i class="fas fa-question-circle text-primary mr-1"></i>
                            ${opinion.question}
                          </div>
                          <div class="bg-green-50 p-2 rounded">
                            <div class="flex items-center gap-1 mb-1">
                              <i class="fas fa-user-nurse text-green-600 text-xs"></i>
                              <span class="text-xs font-medium text-green-700">${opinion.answered_by || 'スタッフ'}</span>
                            </div>
                            <p class="text-xs text-gray-800">${opinion.answer}</p>
                          </div>
                        </div>
                      `).join('')}
                      ${answeredOpinions.length > 2 ? `
                        <a href="/mypage#qa-section" class="block text-xs text-center text-primary hover:underline">
                          全ての回答を見る (${answeredOpinions.length}件) →
                        </a>
                      ` : ''}
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          })()}
          
          <!-- 保存ボタン（質問・相談の下） -->
          <div class="mt-2">
            <button type="submit" form="health-log-form" class="w-full btn-primary px-4 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition">
              <i class="fas fa-save mr-2"></i>
              ログを保存
            </button>
          </div>
          
          <!-- マイページリンク -->
          <div class="mt-3 text-center">
            <a href="/mypage" class="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium">
              <i class="fas fa-chart-line"></i>
              マイデータで詳しい分析を見る
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
      <div class="container mx-auto px-6 md:px-8">
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
      <div class="container mx-auto px-6 md:px-8">
        <div class="max-w-5xl mx-auto">
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
      <div class="container mx-auto px-6 md:px-8">
        <div class="max-w-5xl mx-auto">
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
      <div class="container mx-auto px-6 md:px-8">
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
      <div class="container mx-auto px-6 md:px-8">
        <div class="max-w-5xl mx-auto">
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

// 指定日付のログを読み込む
async function loadLogForDate(dateString) {
  try {
    console.log('Loading log for date:', dateString);
    
    const token = getToken();
    
    // ★ 重要: まず全ログを取得（グラフ用）
    const allLogsResponse = await axios.get('/api/health-logs', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('All logs response:', allLogsResponse.data);
    
    if (allLogsResponse.data.success) {
      allHealthLogs = allLogsResponse.data.data || [];
      console.log('All health logs loaded:', allHealthLogs.length, 'records');
      
      // 指定日付のログを検索
      todayLog = allHealthLogs.find(log => log.log_date === dateString);
      console.log('Found log for', dateString, ':', todayLog);
    } else {
      todayLog = null;
      console.log('No log found for date:', dateString);
    }
    
    // 食事データを復元
    if (todayLog && todayLog.meals) {
      const meals = typeof todayLog.meals === 'string' ? JSON.parse(todayLog.meals) : todayLog.meals;
      mealData = {
        breakfast: meals.breakfast || { calories: 0, protein: 0, carbs: 0, fat: 0, photos: [] },
        lunch: meals.lunch || { calories: 0, protein: 0, carbs: 0, fat: 0, photos: [] },
        dinner: meals.dinner || { calories: 0, protein: 0, carbs: 0, fat: 0, photos: [] }
      };
      console.log('Restored meal data:', mealData);
    } else {
      mealData = {
        breakfast: { calories: 0, protein: 0, carbs: 0, fat: 0, photos: [] },
        lunch: { calories: 0, protein: 0, carbs: 0, fat: 0, photos: [] },
        dinner: { calories: 0, protein: 0, carbs: 0, fat: 0, photos: [] }
      };
      console.log('No meal data, using empty data');
    }
    
    // ページを再レンダリング
    console.log('Rendering page with todayLog:', todayLog);
    renderPage();
    
    // 初期化処理
    setTimeout(() => {
      // BMIを更新
      updateBMIDisplay();
      
      // 食事カロリー表示を更新
      if (mealData) {
        ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
          const caloriesInput = document.getElementById(`${mealType}-calories`);
          if (caloriesInput && mealData[mealType]) {
            caloriesInput.value = mealData[mealType].calories || 0;
          }
        });
      }
      
      console.log('Initialization complete');
    }, 100);
    
  } catch (error) {
    console.error('Failed to load log for date:', error);
    showToast('ログの読み込みに失敗しました', 'error');
  }
}

// 日付変更ハンドラー（前後移動）
async function changeLogDate(days) {
  if (!selectedDate) selectedDate = dayjs().format('YYYY-MM-DD');
  
  const newDate = dayjs(selectedDate).add(days, 'day').format('YYYY-MM-DD');
  const today = dayjs().format('YYYY-MM-DD');
  
  // 未来の日付には移動しない
  if (newDate > today) {
    showToast('未来の日付は選択できません', 'error');
    return;
  }
  
  console.log('Changing date from', selectedDate, 'to', newDate);
  selectedDate = newDate;
  
  // 日付ピッカーの値を更新
  const picker = document.getElementById('log-date-picker');
  if (picker) picker.value = newDate;
  
  // ログを読み込んでページを再レンダリング
  await loadLogForDate(selectedDate);
}

// 日付ピッカーから変更
async function changeLogDateFromPicker(dateString) {
  console.log('Date picker changed to:', dateString);
  selectedDate = dateString;
  await loadLogForDate(selectedDate);
}

// 今日に戻る
async function goToToday() {
  const today = dayjs().format('YYYY-MM-DD');
  console.log('Going to today:', today);
  selectedDate = today;
  
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
    console.log('Submitting health log:', data);
    console.log('todayLog exists:', !!todayLog);
    
    const token = getToken();
    let response;
    
    if (todayLog && todayLog.id) {
      // 既存ログの更新
      console.log('Updating existing log:', todayLog.id);
      response = await axios.put(`/api/health-logs/${todayLog.id}`, data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } else {
      // 新規ログの作成
      console.log('Creating new log for date:', data.log_date);
      response = await axios.post('/api/health-logs', data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    }
    
    console.log('Save response:', response.data);
    
    if (response.data.success) {
      showToast(`${formatDateDisplay(data.log_date)}の健康ログを保存しました`, 'success');
      
      // 保存した日付を選択日付として設定
      selectedDate = data.log_date;
      
      // 選択された日付のログを再読み込み
      await loadLogForDate(selectedDate);
      
      // AI分析完了を待って未読カウントを更新（3秒後）
      setTimeout(async () => {
        await loadUnreadCount();
        await loadTodayAdvices();
      }, 3000);
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
      
      <!-- 管理者ログインボタン -->
      <div class="border-t pt-4 mt-4">
        <button onclick="quickAdminLogin()" class="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 rounded-lg text-sm font-medium transition shadow-sm">
          <i class="fas fa-user-shield mr-2"></i>
          管理者ログイン（仮）
        </button>
        <p class="text-xs text-gray-500 text-center mt-2">
          ※ ワンクリックで管理者としてログインできます
        </p>
      </div>
      
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
    meal: '食事',
    exercise: '運動',
    mental: 'メンタル',
    sleep: '睡眠',
    weight: '体重管理',
    diet: '食事',  // 後方互換性
    general: '全般',
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
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  
  modal.innerHTML = `
    <div class="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onclick="event.stopPropagation()">
      <div class="flex justify-between items-start mb-4">
        <h3 class="text-xl font-bold text-gray-800">${announcement.title}</h3>
        <button onclick="this.closest('.fixed').remove()" 
          class="text-gray-400 hover:text-gray-600 text-2xl">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      ${announcement.image_url ? `
        <img src="${announcement.image_url}" alt="${announcement.title}" 
          class="w-full max-h-80 object-cover rounded-xl mb-4">
      ` : ''}
      
      <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">${announcement.content}</p>
      
      <div class="mt-4 text-xs text-gray-400 text-right">
        <i class="fas fa-clock mr-1"></i>
        ${dayjs(announcement.published_at).format('YYYY年MM月DD日 HH:mm')}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// 全てのお知らせを表示
function showAllAnnouncements() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  
  modal.innerHTML = `
    <div class="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onclick="event.stopPropagation()">
      <div class="flex justify-between items-center mb-6 pb-4 border-b sticky top-0 bg-white">
        <h3 class="text-2xl font-bold text-gray-800">
          <i class="fas fa-bell text-primary mr-2"></i>
          お知らせ一覧
        </h3>
        <button onclick="this.closest('.fixed').remove()" 
          class="text-gray-400 hover:text-gray-600 text-2xl">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="space-y-3">
        ${announcements.length > 0 ? announcements.map(announcement => `
          <div class="bg-gray-50 hover:bg-gray-100 p-4 rounded-xl transition cursor-pointer border border-gray-200 hover:border-primary"
               onclick="this.closest('.fixed').remove(); showAnnouncementDetail(${announcement.id});">
            <div class="flex gap-4 items-start">
              ${announcement.image_url ? `
                <img src="${announcement.image_url}" alt="${announcement.title}" 
                  class="w-20 h-20 object-cover rounded-lg flex-shrink-0">
              ` : `
                <div class="w-20 h-20 bg-gradient-to-br from-primary to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-bullhorn text-white text-2xl"></i>
                </div>
              `}
              <div class="flex-1 min-w-0">
                <h4 class="text-base font-bold text-gray-800 mb-1">${announcement.title}</h4>
                <p class="text-sm text-gray-600 line-clamp-2 mb-2">${announcement.content}</p>
                <div class="text-xs text-gray-400">
                  <i class="fas fa-clock mr-1"></i>
                  ${dayjs(announcement.published_at).format('YYYY年MM月DD日')}
                </div>
              </div>
              <i class="fas fa-chevron-right text-gray-400"></i>
            </div>
          </div>
        `).join('') : `
          <div class="text-center py-12 text-gray-400">
            <i class="fas fa-inbox text-5xl mb-4"></i>
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

// 質問・相談データをロード
async function loadOpinions() {
  try {
    const response = await apiCall(`/api/opinions/user/${currentUser.id}`);
    if (response.success) {
      opinions = response.data;
    }
  } catch (error) {
    console.error('質問・相談データの取得に失敗:', error);
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
      await loadOpinions(); // 質問リストを再読み込み
      renderPage(); // ページを再レンダリング
    }
  } catch (error) {
    showToast('送信に失敗しました', 'error');
  }
}

// ダッシュボード更新（新機能）
function updateDashboard() {
  // クイック統計は削除されたため、この関数は不要だが互換性のため残す
  // 将来的に削除可能
}

// グラフ期間ナビゲーション
function navigateGraphPeriod(direction) {
  graphPeriodOffset = Math.max(0, graphPeriodOffset + direction);
  renderHeroChart();
  
  // 次へボタンの有効/無効を切り替え
  const nextBtn = document.getElementById('graph-next-btn');
  if (nextBtn) {
    if (graphPeriodOffset === 0) {
      nextBtn.disabled = true;
      nextBtn.style.opacity = '0.3';
      nextBtn.style.cursor = 'not-allowed';
    } else {
      nextBtn.disabled = false;
      nextBtn.style.opacity = '1';
      nextBtn.style.cursor = 'pointer';
    }
  }
}

// ヒーローグラフ描画
function renderHeroChart() {
  const canvas = document.getElementById('hero-chart');
  if (!canvas || !allHealthLogs || allHealthLogs.length === 0) return;
  
  // 期間の計算（今日から遡って30日単位）
  const today = dayjs();
  const startOffset = graphPeriodOffset * 30;
  const endOffset = startOffset + 30;
  const endDate = today.subtract(startOffset, 'day');
  const startDate = today.subtract(endOffset, 'day');
  
  // 期間ラベル更新
  const periodLabel = document.getElementById('graph-period-label');
  if (periodLabel) {
    if (graphPeriodOffset === 0) {
      periodLabel.textContent = '最新30日';
    } else {
      periodLabel.textContent = `${startDate.format('M/D')} - ${endDate.format('M/D')}`;
    }
  }
  
  // 30日分の日付配列を生成（データがない日も含む）
  const allDates = [];
  const dateToLogMap = {};
  
  // データフィルタリング（期間内のログのみ）
  const filteredLogs = allHealthLogs.filter(log => {
    const logDate = dayjs(log.log_date);
    return logDate.isAfter(startDate) && logDate.isBefore(endDate.add(1, 'day'));
  });
  
  // ログデータをマップに格納
  filteredLogs.forEach(log => {
    dateToLogMap[log.log_date] = log;
  });
  
  // 30日分すべての日付を生成
  for (let i = 0; i < 30; i++) {
    const date = startDate.add(i + 1, 'day');
    allDates.push(date.format('YYYY-MM-DD'));
  }
  
  // ラベルとデータ作成（すべての日付分）
  const labels = allDates.map(date => dayjs(date).format('M/D'));
  const weightData = allDates.map(date => {
    const log = dateToLogMap[date];
    return log ? (log.weight || null) : null;
  });
  const bodyfatData = allDates.map(date => {
    const log = dateToLogMap[date];
    return log ? (log.body_fat_percentage || null) : null;
  });
  const sleepData = allDates.map(date => {
    const log = dateToLogMap[date];
    return log ? (log.sleep_hours || null) : null;
  });
  const caloriesData = allDates.map(date => {
    const log = dateToLogMap[date];
    return log && log.meal_calories ? log.meal_calories / 100 : null;
  });
  
  // 既存のチャートを破棄
  if (heroChart) {
    heroChart.destroy();
  }
  
  // 新しいチャート作成
  const ctx = canvas.getContext('2d');
  heroChart = new Chart(ctx, {
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
          spanGaps: true,
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
          spanGaps: true,
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
          spanGaps: true,
          yAxisID: 'y'
        },
        {
          label: 'カロリー (÷100)',
          data: caloriesData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          spanGaps: true,
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
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: { size: 12 },
          bodyFont: { size: 11 },
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                if (label.includes('カロリー')) {
                  label += Math.round(context.parsed.y * 100) + ' kcal';
                } else if (label.includes('体重')) {
                  label += context.parsed.y + ' kg';
                } else if (label.includes('体脂肪')) {
                  label += context.parsed.y + ' %';
                } else if (label.includes('睡眠')) {
                  label += context.parsed.y + ' h';
                }
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: { size: 9 },
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          beginAtZero: false,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            font: { size: 10 }
          }
        }
      }
    }
  });
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

// 運動ログの折りたたみトグル
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

// メインタブの切り替え
function switchMainTab(tabName) {
  // すべてのタブボタンを非アクティブ化
  const tabButtons = ['home', 'basic', 'meals', 'exercise', 'detailed'];
  tabButtons.forEach(tab => {
    const button = document.getElementById(`main-tab-${tab}`);
    const content = document.getElementById(`main-tab-content-${tab}`);
    
    if (button && content) {
      if (tab === tabName) {
        // アクティブタブ
        button.classList.add('border-primary', 'bg-primary/5', 'text-primary');
        button.classList.remove('border-transparent', 'text-gray-500');
        content.classList.remove('hidden');
      } else {
        // 非アクティブタブ
        button.classList.remove('border-primary', 'bg-primary/5', 'text-primary');
        button.classList.add('border-transparent', 'text-gray-500');
        content.classList.add('hidden');
      }
    }
  });
  
  // タブ切り替え後、必要な再計算を実行
  setTimeout(() => {
    if (tabName === 'home') {
      renderHeroChart();
    } else if (tabName === 'basic') {
      updateBMIDisplay();
    } else if (tabName === 'meals') {
      updateTotalCaloriesDisplay();
    } else if (tabName === 'exercise') {
      updateExerciseSummary();
    }
  }, 100);
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

// 質問・相談ボックスの折りたたみトグル
function toggleOpinionBox() {
  const opinionBox = document.getElementById('opinion-box');
  const arrow = document.getElementById('opinion-box-arrow');
  
  if (opinionBox && arrow) {
    if (opinionBox.classList.contains('hidden')) {
      opinionBox.classList.remove('hidden');
      arrow.classList.add('rotate-180');
    } else {
      opinionBox.classList.add('hidden');
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
// 運動ログ関数
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

// セクションへスクロール
function scrollToSection(sectionId) {
  // セクションIDに対応する実際の要素を探す
  let targetElement = null;
  
  switch(sectionId) {
    case 'meal-section':
      // 食事記録セクションへ
      targetElement = document.querySelector('[class*="食事記録"]')?.parentElement;
      if (!targetElement) {
        targetElement = document.getElementById('health-log-form');
      }
      break;
    case 'exercise-section':
      // 運動ログセクションへ
      targetElement = document.getElementById('exercise-tracker')?.parentElement;
      break;
    case 'weight-section':
      // 体重入力セクションへ
      targetElement = document.getElementById('weight-input')?.closest('.bg-white');
      break;
    default:
      targetElement = document.getElementById(sectionId);
  }
  
  if (targetElement) {
    targetElement.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    // スクロール後にハイライト効果
    targetElement.classList.add('ring-2', 'ring-primary', 'ring-opacity-50');
    setTimeout(() => {
      targetElement.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50');
    }, 2000);
  } else {
    // フォールバック：health-log-formにスクロール
    const form = document.getElementById('health-log-form');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

// お知らせ詳細を表示
// お知らせモーダル関数は上部で定義済み

// ヒーロー画像スライドショー
function startHeroSlideshow() {
  if (gymImages.length <= 1) return; // 画像が1枚以下ならスキップ
  
  setInterval(() => {
    // 現在の画像をフェードアウト
    const currentImg = document.getElementById(`hero-image-${currentImageIndex}`);
    if (currentImg) {
      currentImg.classList.remove('opacity-100');
      currentImg.classList.add('opacity-0');
    }
    
    // 次の画像インデックスを計算
    currentImageIndex = (currentImageIndex + 1) % gymImages.length;
    
    // 次の画像をフェードイン
    const nextImg = document.getElementById(`hero-image-${currentImageIndex}`);
    if (nextImg) {
      nextImg.classList.remove('opacity-0');
      nextImg.classList.add('opacity-100');
    }
  }, 5000); // 5秒ごとに切り替え
}

