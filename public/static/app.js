// トップページ - ファディー彦根

// 状態管理
let currentUser = null;
let currentAdvices = [];
let todayLog = null;
let announcements = [];
let latestStaffComment = null;
let userOpinions = [];
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
    await loadUserOpinions();
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
    ${renderFeaturesSection()}
    ${renderFAQSection()}
    ${renderGymIntroSection()}
    ${renderContactSection()}
    ${renderFooter()}
  `;
  
  // イベントリスナー設定
  setupEventListeners();
}

// 共通ヘッダー
function renderHeader() {
  return `
    <header class="bg-white shadow-md sticky top-0 z-50">
      <div class="container mx-auto px-4 py-3">
        <div class="flex justify-between items-center">
          <a href="/" class="flex items-center gap-2">
            <i class="fas fa-dumbbell text-lg" style="color: var(--color-primary)"></i>
            <h1 class="text-lg font-bold" style="color: var(--color-primary)">ファディー彦根</h1>
          </a>
          
          <nav class="flex items-center gap-2">
            ${currentUser ? `
              <button onclick="logout()" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition flex items-center gap-2">
                <i class="fas fa-sign-out-alt"></i>
                <span>ログアウト</span>
              </button>
            ` : `
              <button onclick="showLoginModal()" class="px-4 py-2 bg-primary text-white hover:bg-opacity-90 rounded-lg transition flex items-center gap-2">
                <i class="fas fa-sign-in-alt"></i>
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
            <h2 class="text-4xl md:text-5xl font-bold mb-4">
              AIがサポートする<br>あなた専用の<br>パーソナルジム
            </h2>
            <p class="text-lg mb-6 opacity-90">
              体調・体重・食事を記録するだけで、<br class="hidden md:block">
              AIとプロのスタッフが<br class="hidden md:block">
              あなたに最適なアドバイスをお届けします
            </p>
            ${!currentUser ? `
              <button onclick="showLoginModal()" class="px-8 py-4 bg-white text-primary hover:bg-opacity-90 rounded-lg font-bold text-lg transition transform hover:scale-105">
                今すぐ始める <i class="fas fa-arrow-right ml-2"></i>
              </button>
            ` : `
              <a href="/mypage" class="inline-block px-8 py-4 bg-white text-primary hover:bg-opacity-90 rounded-lg font-bold text-lg transition transform hover:scale-105">
                マイページへ <i class="fas fa-arrow-right ml-2"></i>
              </a>
            `}
          </div>
          
          <!-- お知らせ（枠なし、小さく） -->
          ${announcements.length > 0 ? `
            <div class="mt-8 space-y-2">
              ${announcements.map(announcement => `
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
    <section class="bg-gray-50 py-12">
      <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-clipboard-list mr-2" style="color: var(--color-primary)"></i>
              健康ログ
            </h3>
            
            <!-- 日付選択 -->
            <div class="flex items-center gap-2">
              <button type="button" onclick="changeLogDate(-1)" class="p-2 text-gray-600 hover:text-primary transition">
                <i class="fas fa-chevron-left"></i>
              </button>
              <div class="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                <i class="fas fa-calendar-alt text-primary"></i>
                <input type="date" id="log-date-picker" value="${selectedDate || dayjs().format('YYYY-MM-DD')}" 
                  onchange="changeLogDateFromPicker(this.value)"
                  class="bg-transparent text-sm font-medium text-gray-700 border-none focus:outline-none cursor-pointer">
              </div>
              <button type="button" onclick="changeLogDate(1)" class="p-2 text-gray-600 hover:text-primary transition">
                <i class="fas fa-chevron-right"></i>
              </button>
              <button type="button" onclick="goToToday()" class="ml-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-opacity-90 transition">
                今日
              </button>
            </div>
          </div>
          
          <!-- 選択された日付の表示 -->
          <div class="mb-6 text-center">
            <div class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
              <i class="fas fa-calendar-day text-primary"></i>
              <span class="text-lg font-bold text-gray-800" id="selected-date-display">
                ${formatDateDisplay(selectedDate || dayjs().format('YYYY-MM-DD'))}
              </span>
            </div>
          </div>
          
          <!-- スタッフコメント（最新1件） -->
          ${latestStaffComment ? `
            <div class="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <i class="fas fa-user-nurse text-white"></i>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-bold text-blue-700">スタッフからのコメント</span>
                    <span class="text-xs text-gray-500">${latestStaffComment.staff_name} • ${formatRelativeTime(latestStaffComment.created_at)}</span>
                  </div>
                  <p class="text-sm text-gray-700">${latestStaffComment.comment}</p>
                </div>
              </div>
            </div>
          ` : ''}
          
          <form id="health-log-form" class="space-y-6">
            <!-- 基本データ -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-weight mr-1"></i> 体重 (kg)
                </label>
                <input type="number" step="0.1" name="weight" value="${todayLog?.weight || ''}" 
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-percentage mr-1"></i> 体脂肪率 (%)
                </label>
                <input type="number" step="0.1" name="body_fat_percentage" value="${todayLog?.body_fat_percentage || ''}"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-bed mr-1"></i> 睡眠 (時間)
                </label>
                <input type="number" step="0.5" name="sleep_hours" value="${todayLog?.sleep_hours || ''}"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-running mr-1"></i> 運動 (分)
                </label>
                <input type="number" name="exercise_minutes" value="${todayLog?.exercise_minutes || ''}"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
              </div>
            </div>
            
            <!-- 食事記録 -->
            <div class="border-t pt-4">
              <h4 class="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <i class="fas fa-utensils" style="color: var(--color-accent)"></i>
                食事記録
              </h4>
              
              <!-- 朝食 -->
              <div class="mb-3 bg-yellow-50 p-3 rounded-lg">
                <div class="flex items-center justify-between mb-2">
                  <h5 class="text-sm font-bold text-gray-800 flex items-center gap-1">
                    <i class="fas fa-sun text-yellow-500"></i>朝食
                  </h5>
                  <button type="button" onclick="showMealModal('breakfast')" class="text-xs px-3 py-1 bg-accent text-white rounded hover:bg-opacity-90">
                    <i class="fas fa-camera mr-1"></i>追加
                  </button>
                </div>
                <div id="breakfast-photos" class="grid grid-cols-3 gap-1 mb-2"></div>
                <div class="grid grid-cols-4 gap-1 text-xs">
                  <div>
                    <label class="block text-xs text-gray-600 mb-0.5">cal</label>
                    <input type="number" id="breakfast-calories" readonly 
                      class="w-full px-1.5 py-0.5 border rounded text-center bg-white text-xs">
                  </div>
                  <div>
                    <label class="block text-xs text-gray-600 mb-0.5">P</label>
                    <input type="number" id="breakfast-protein" readonly 
                      class="w-full px-1.5 py-0.5 border rounded text-center bg-white text-xs">
                  </div>
                  <div>
                    <label class="block text-xs text-gray-600 mb-0.5">F</label>
                    <input type="number" id="breakfast-fat" readonly 
                      class="w-full px-1.5 py-0.5 border rounded text-center bg-white text-xs">
                  </div>
                  <div>
                    <label class="block text-xs text-gray-600 mb-0.5">C</label>
                    <input type="number" id="breakfast-carbs" readonly 
                      class="w-full px-1.5 py-0.5 border rounded text-center bg-white text-xs">
                  </div>
                </div>
              </div>
              
              <!-- 昼食 -->
              <div class="mb-3 bg-orange-50 p-3 rounded-lg">
                <div class="flex items-center justify-between mb-2">
                  <h5 class="text-sm font-bold text-gray-800 flex items-center gap-1">
                    <i class="fas fa-cloud-sun text-orange-500"></i>昼食
                  </h5>
                  <button type="button" onclick="showMealModal('lunch')" class="text-xs px-3 py-1 bg-accent text-white rounded hover:bg-opacity-90">
                    <i class="fas fa-camera mr-1"></i>追加
                  </button>
                </div>
                <div id="lunch-photos" class="grid grid-cols-3 gap-1 mb-2"></div>
                <div class="grid grid-cols-4 gap-1 text-xs">
                  <div>
                    <label class="block text-xs text-gray-600 mb-0.5">cal</label>
                    <input type="number" id="lunch-calories" readonly 
                      class="w-full px-1.5 py-0.5 border rounded text-center bg-white text-xs">
                  </div>
                  <div>
                    <label class="block text-xs text-gray-600 mb-0.5">P</label>
                    <input type="number" id="lunch-protein" readonly 
                      class="w-full px-1.5 py-0.5 border rounded text-center bg-white text-xs">
                  </div>
                  <div>
                    <label class="block text-xs text-gray-600 mb-0.5">F</label>
                    <input type="number" id="lunch-fat" readonly 
                      class="w-full px-1.5 py-0.5 border rounded text-center bg-white text-xs">
                  </div>
                  <div>
                    <label class="block text-xs text-gray-600 mb-0.5">C</label>
                    <input type="number" id="lunch-carbs" readonly 
                      class="w-full px-1.5 py-0.5 border rounded text-center bg-white text-xs">
                  </div>
                </div>
              </div>
              
              <!-- 夕食 -->
              <div class="mb-3 bg-blue-50 p-3 rounded-lg">
                <div class="flex items-center justify-between mb-2">
                  <h5 class="text-sm font-bold text-gray-800 flex items-center gap-1">
                    <i class="fas fa-moon text-blue-500"></i>夕食
                  </h5>
                  <button type="button" onclick="showMealModal('dinner')" class="text-xs px-3 py-1 bg-accent text-white rounded hover:bg-opacity-90">
                    <i class="fas fa-camera mr-1"></i>追加
                  </button>
                </div>
                <div id="dinner-photos" class="grid grid-cols-3 gap-1 mb-2"></div>
                <div class="grid grid-cols-4 gap-1 text-xs">
                  <div>
                    <label class="block text-xs text-gray-600 mb-0.5">cal</label>
                    <input type="number" id="dinner-calories" readonly 
                      class="w-full px-1.5 py-0.5 border rounded text-center bg-white text-xs">
                  </div>
                  <div>
                    <label class="block text-xs text-gray-600 mb-0.5">P</label>
                    <input type="number" id="dinner-protein" readonly 
                      class="w-full px-1.5 py-0.5 border rounded text-center bg-white text-xs">
                  </div>
                  <div>
                    <label class="block text-xs text-gray-600 mb-0.5">F</label>
                    <input type="number" id="dinner-fat" readonly 
                      class="w-full px-1.5 py-0.5 border rounded text-center bg-white text-xs">
                  </div>
                  <div>
                    <label class="block text-xs text-gray-600 mb-0.5">C</label>
                    <input type="number" id="dinner-carbs" readonly 
                      class="w-full px-1.5 py-0.5 border rounded text-center bg-white text-xs">
                  </div>
                </div>
              </div>
              
              <!-- 合計 -->
              <div class="bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200">
                <h5 class="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <i class="fas fa-calculator" style="color: var(--color-primary)"></i>1日の合計
                </h5>
                <div class="grid grid-cols-4 gap-2">
                  <div class="text-center bg-white rounded p-2">
                    <div class="text-lg font-bold text-primary" id="total-calories">0</div>
                    <div class="text-xs text-gray-600">kcal</div>
                  </div>
                  <div class="text-center bg-white rounded p-2">
                    <div class="text-lg font-bold text-green-600" id="total-protein">0</div>
                    <div class="text-xs text-gray-600">P (g)</div>
                  </div>
                  <div class="text-center bg-white rounded p-2">
                    <div class="text-lg font-bold text-yellow-600" id="total-fat">0</div>
                    <div class="text-xs text-gray-600">F (g)</div>
                  </div>
                  <div class="text-center bg-white rounded p-2">
                    <div class="text-lg font-bold text-blue-600" id="total-carbs">0</div>
                    <div class="text-xs text-gray-600">C (g)</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 5段階体調評価 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-3">
                <i class="fas fa-smile mr-1"></i> 今日の体調
              </label>
              <div class="flex items-center justify-between gap-2 bg-gray-50 p-4 rounded-lg">
                ${[1, 2, 3, 4, 5].map(rating => {
                  const icons = ['fa-tired', 'fa-frown', 'fa-meh', 'fa-smile', 'fa-grin-stars'];
                  const colors = ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-green-500', 'text-blue-500'];
                  const labels = ['とても悪い', '悪い', '普通', '良い', 'とても良い'];
                  const isSelected = (todayLog?.condition_rating || 3) === rating;
                  
                  return `
                    <label class="flex-1 cursor-pointer" onclick="selectConditionRating(${rating})">
                      <input type="radio" name="condition_rating" value="${rating}" 
                        ${isSelected ? 'checked' : ''}
                        class="hidden" id="condition-rating-${rating}">
                      <div class="flex flex-col items-center p-3 rounded-lg transition ${isSelected ? 'bg-white shadow-md' : 'hover:bg-white hover:bg-opacity-50'}" id="condition-rating-label-${rating}">
                        <i class="fas ${icons[rating-1]} text-3xl ${isSelected ? colors[rating-1] : 'text-gray-400'} mb-1" id="condition-rating-icon-${rating}"></i>
                        <span class="text-xs font-medium ${isSelected ? 'text-gray-800' : 'text-gray-500'}" id="condition-rating-text-${rating}">${labels[rating-1]}</span>
                      </div>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-dumbbell mr-1"></i> 運動記録
              </label>
              <textarea name="condition_note" rows="3" 
                placeholder="例：ジムでベンチプレス60kg × 10回 × 3セット、ランニング5km（30分）"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >${todayLog?.condition_note || ''}</textarea>
            </div>
            
            <button type="submit" class="w-full btn-primary px-6 py-3 rounded-lg font-bold text-lg">
              <i class="fas fa-save mr-2"></i>
              保存する
            </button>
          </form>
          
          <!-- マイページへのリンク -->
          <div class="mt-4 text-center">
            <a href="/mypage" class="inline-flex items-center gap-2 text-primary hover:underline font-medium">
              <i class="fas fa-chart-line"></i>
              マイページへ
              <i class="fas fa-arrow-right"></i>
            </a>
          </div>
          
          <!-- スタッフに質問・相談する -->
          <div class="mt-6 border-t pt-6">
            <h4 class="text-lg font-bold text-gray-800 mb-4">
              <i class="fas fa-comments mr-2" style="color: var(--color-primary)"></i>
              スタッフに質問・相談する
            </h4>
            <div>
              <textarea 
                id="opinion-question-top" 
                rows="3" 
                placeholder="例：効果的な筋トレ方法を教えてください、プロテインのタイミングは？など..."
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              ></textarea>
              <div class="flex justify-end mt-2">
                <button 
                  type="button"
                  onclick="submitOpinionFromTop()" 
                  class="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-opacity-90 transition"
                >
                  <i class="fas fa-paper-plane mr-1"></i>
                  質問を送信
                </button>
              </div>
            </div>
          </div>
          
          <!-- 過去の質問と回答 -->
          <div class="mt-6">
            <h4 class="text-lg font-bold text-gray-800 mb-4">
              <i class="fas fa-history mr-2" style="color: var(--color-primary)"></i>
              過去の質問と回答
            </h4>
            ${userOpinions.length > 0 ? renderOpinionHistory() : `
              <div class="text-center py-8">
                <div class="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <i class="fas fa-inbox text-4xl text-gray-300"></i>
                </div>
                <p class="text-gray-500 text-sm">まだ質問・相談を投稿していません</p>
              </div>
            `}
          </div>
        </div>
      </div>
    </section>
  `;
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
    // 食事データ
    meal_calories: totalCalories || null,
    meal_protein: totalProtein || null,
    meal_carbs: totalCarbs || null,
    meal_fat: totalFat || null,
    meal_analysis: JSON.stringify(mealData) || null,
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
      
      // 保存後にマイページへのリンクを表示
      showModal(
        '保存完了',
        '健康ログを保存しました。マイページで詳細を確認しますか？',
        () => {
          window.location.href = '/mypage';
        }
      );
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
    
    // UI更新
    updateMealDisplay(mealType);
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
  
  document.getElementById('total-calories').textContent = total.calories;
  document.getElementById('total-protein').textContent = total.protein;
  document.getElementById('total-fat').textContent = total.fat;
  document.getElementById('total-carbs').textContent = total.carbs;
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
function showLoginModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-8 max-w-md">
      <div class="text-center mb-6">
        <h3 class="text-2xl font-bold mb-2">ログイン / 新規登録</h3>
        <p class="text-gray-600">以下の方法でアクセスしてください</p>
      </div>
      
      <!-- タブ切り替え -->
      <div class="flex mb-6 bg-gray-100 p-1 rounded-lg">
        <button onclick="switchAuthTab('oauth')" id="auth-tab-oauth" class="flex-1 py-2 px-4 rounded-md font-medium transition bg-white shadow">
          SNSログイン
        </button>
        <button onclick="switchAuthTab('email')" id="auth-tab-email" class="flex-1 py-2 px-4 rounded-md font-medium transition text-gray-600">
          メール登録
        </button>
        <button onclick="switchAuthTab('admin')" id="auth-tab-admin" class="flex-1 py-2 px-4 rounded-md font-medium transition text-gray-600">
          管理者
        </button>
      </div>
      
      <!-- OAuth認証 -->
      <div id="auth-content-oauth" class="auth-content">
        <div class="space-y-3">
          <button onclick="loginWithGoogle()" class="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-gray-300 hover:border-primary rounded-lg transition">
            <i class="fab fa-google text-xl" style="color: #DB4437"></i>
            <span class="font-medium">Googleでログイン</span>
          </button>
          
          <button onclick="loginWithLine()" class="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-gray-300 hover:border-primary rounded-lg transition">
            <i class="fab fa-line text-xl" style="color: #00B900"></i>
            <span class="font-medium">LINEでログイン</span>
          </button>
        </div>
        <p class="text-xs text-gray-500 text-center mt-4">
          初めての方は自動的に新規登録されます
        </p>
      </div>
      
      <!-- メール新規登録 -->
      <div id="auth-content-email" class="auth-content hidden">
        <form id="email-register-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">お名前 *</label>
            <input type="text" name="name" required 
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">メールアドレス *</label>
            <input type="email" name="email" required 
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">パスワード *</label>
            <input type="password" name="password" required minlength="6"
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
          </div>
          
          <button type="submit" class="w-full btn-primary px-6 py-3 rounded-lg font-bold">
            <i class="fas fa-user-plus mr-2"></i>
            新規登録
          </button>
        </form>
        <p class="text-xs text-gray-500 text-center mt-4">
          登録後、自動的にログインされます
        </p>
      </div>
      
      <!-- 管理者ログイン -->
      <div id="auth-content-admin" class="auth-content hidden">
        <form id="admin-login-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">管理者メールアドレス *</label>
            <input type="email" name="email" required value="admin@furdi.jp"
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">パスワード *</label>
            <input type="password" name="password" required value="admin123"
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
          </div>
          
          <button type="submit" class="w-full btn-primary px-6 py-3 rounded-lg font-bold">
            <i class="fas fa-shield-alt mr-2"></i>
            管理者ログイン
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
      </div>
      
      <button onclick="this.closest('.modal-backdrop').remove()" class="mt-6 w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg transition">
        キャンセル
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // イベントリスナー設定
  document.getElementById('email-register-form')?.addEventListener('submit', handleEmailRegister);
  document.getElementById('admin-login-form')?.addEventListener('submit', handleAdminLogin);
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
}

// 認証タブ切り替え
function switchAuthTab(tab) {
  // タブボタンの状態更新
  ['oauth', 'email', 'admin'].forEach(t => {
    const btn = document.getElementById(`auth-tab-${t}`);
    const content = document.getElementById(`auth-content-${t}`);
    
    if (t === tab) {
      btn.classList.add('bg-white', 'shadow');
      btn.classList.remove('text-gray-600');
      content.classList.remove('hidden');
    } else {
      btn.classList.remove('bg-white', 'shadow');
      btn.classList.add('text-gray-600');
      content.classList.add('hidden');
    }
  });
}

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
  }
}

// メール新規登録
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

// ユーザーのオピニオンをロード
async function loadUserOpinions() {
  try {
    const response = await apiCall(`/api/opinions/user/${currentUser.id}`);
    if (response.success) {
      userOpinions = response.data;
    }
  } catch (error) {
    console.error('オピニオンの取得に失敗:', error);
  }
}

// オピニオン履歴レンダリング
function renderOpinionHistory() {
  const pendingOpinions = userOpinions.filter(op => op.status === 'pending');
  const answeredOpinions = userOpinions.filter(op => op.status === 'answered');
  
  // 全ての質問を時系列で表示（未回答と回答済みを混ぜて表示）
  const allOpinions = [...userOpinions].sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );
  
  return `
    <div class="space-y-4">
      ${allOpinions.slice(0, 5).map(opinion => {
        const isPending = opinion.status === 'pending';
        return `
          <div class="bg-gray-50 p-4 rounded-lg border ${isPending ? 'border-orange-300' : 'border-green-300'}">
            <!-- 質問部分 -->
            <div class="mb-3">
              <div class="flex justify-between items-start mb-2">
                <span class="text-xs text-gray-500">
                  <i class="fas fa-clock mr-1"></i>${formatDateTime(opinion.created_at)}
                </span>
                <span class="px-2 py-1 text-xs rounded ${isPending ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}">
                  ${isPending ? '回答待ち' : '回答済み'}
                </span>
              </div>
              <div class="bg-white p-3 rounded border border-gray-200">
                <p class="text-sm text-gray-800">${opinion.question}</p>
              </div>
            </div>
            
            <!-- 回答部分 -->
            ${!isPending ? `
              <div class="bg-blue-50 p-3 rounded border border-blue-200">
                <div class="flex items-center gap-2 mb-2">
                  <i class="fas fa-user-nurse text-blue-600 text-sm"></i>
                  <span class="text-sm font-medium text-blue-700">${opinion.answered_by}</span>
                  <span class="text-xs text-gray-500">• ${formatDateTime(opinion.answered_at)}</span>
                </div>
                <p class="text-sm text-gray-700 whitespace-pre-wrap">${opinion.answer}</p>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
      
      ${allOpinions.length > 5 ? `
        <div class="text-center">
          <a href="/mypage" class="inline-block px-4 py-2 text-sm text-primary hover:underline">
            <i class="fas fa-list mr-1"></i>
            すべての質問を見る（${allOpinions.length}件）
          </a>
        </div>
      ` : allOpinions.length > 0 ? `
        <div class="text-center">
          <a href="/mypage" class="inline-block px-4 py-2 text-sm text-primary hover:underline">
            <i class="fas fa-list mr-1"></i>
            マイページで詳細を確認
          </a>
        </div>
      ` : ''}
    </div>
  `;
}

// トップページからオピニオン送信
async function submitOpinionFromTop() {
  const questionElement = document.getElementById('opinion-question-top');
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
      await loadUserOpinions();
      renderPage();
    }
  } catch (error) {
    showToast('送信に失敗しました', 'error');
  }
}
