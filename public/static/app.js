// トップページ - ファディー彦根

// 状態管理
let currentUser = null;
let currentAdvices = [];
let todayLog = null;

// ページ初期化
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  renderPage();
  
  // 認証されている場合、アドバイスとログをロード
  if (currentUser) {
    await loadAdvices();
    await loadTodayLog();
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

// 今日のログ読み込み
async function loadTodayLog() {
  try {
    const response = await apiCall('/api/health-logs');
    if (response.success) {
      const today = dayjs().format('YYYY-MM-DD');
      todayLog = response.data.find(log => log.log_date === today);
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
    ${renderContactSection()}
    ${renderFooter()}
  `;
  
  // イベントリスナー設定
  setupEventListeners();
}

// ヘッダー
function renderHeader() {
  return `
    <header class="bg-white shadow-sm sticky top-0 z-50">
      <div class="container mx-auto px-4 py-4">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <i class="fas fa-dumbbell text-3xl" style="color: var(--color-primary)"></i>
            <h1 class="text-2xl font-bold" style="color: var(--color-primary)">ファディー彦根</h1>
          </div>
          
          <nav class="hidden md:flex items-center gap-6">
            <a href="#features" class="text-gray-700 hover:text-primary transition">特徴</a>
            <a href="#faq" class="text-gray-700 hover:text-primary transition">FAQ</a>
            <a href="#contact" class="text-gray-700 hover:text-primary transition">お問い合わせ</a>
            ${currentUser ? `
              <a href="/mypage" class="text-gray-700 hover:text-primary transition">マイページ</a>
              ${currentUser.role === 'admin' ? '<a href="/admin" class="text-gray-700 hover:text-primary transition">管理画面</a>' : ''}
              <button onclick="logout()" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition">
                ログアウト
              </button>
            ` : `
              <button onclick="showLoginModal()" class="px-4 py-2 bg-primary text-white hover:bg-opacity-90 rounded-lg transition">
                ログイン
              </button>
            `}
          </nav>
          
          <button class="md:hidden" onclick="toggleMobileMenu()">
            <i class="fas fa-bars text-2xl"></i>
          </button>
        </div>
      </div>
    </header>
  `;
}

// Hero セクション
function renderHero() {
  return `
    <section class="gradient-bg text-white py-20">
      <div class="container mx-auto px-4">
        <div class="max-w-3xl mx-auto text-center fade-in">
          <h2 class="text-4xl md:text-5xl font-bold mb-6">
            AIがサポートする<br>あなた専用のパーソナルジム
          </h2>
          <p class="text-xl mb-8 opacity-90">
            体調・体重・食事を記録するだけで、AIとプロのスタッフが<br>
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
        <div class="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
          <h3 class="text-2xl font-bold text-gray-800 mb-6">
            <i class="fas fa-clipboard-list mr-2" style="color: var(--color-primary)"></i>
            今日の健康ログ
          </h3>
          
          <form id="health-log-form" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-weight mr-1"></i> 体重 (kg)
                </label>
                <input type="number" step="0.1" name="weight" value="${todayLog?.weight || ''}" 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-percentage mr-1"></i> 体脂肪率 (%)
                </label>
                <input type="number" step="0.1" name="body_fat_percentage" value="${todayLog?.body_fat_percentage || ''}"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-thermometer-half mr-1"></i> 体温 (℃)
                </label>
                <input type="number" step="0.1" name="body_temperature" value="${todayLog?.body_temperature || ''}"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-bed mr-1"></i> 睡眠時間 (時間)
                </label>
                <input type="number" step="0.5" name="sleep_hours" value="${todayLog?.sleep_hours || ''}"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  <i class="fas fa-running mr-1"></i> 運動時間 (分)
                </label>
                <input type="number" name="exercise_minutes" value="${todayLog?.exercise_minutes || ''}"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-camera mr-1"></i> 食事写真
              </label>
              <div class="flex items-center gap-4">
                <input type="file" id="meal-photo" accept="image/*" 
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  onchange="previewImage(this, 'meal-preview')">
                <button type="button" onclick="uploadMealPhoto()" class="px-6 py-2 bg-accent text-white hover:bg-opacity-90 rounded-lg transition">
                  AI解析
                </button>
              </div>
              <img id="meal-preview" class="mt-4 max-w-full h-48 object-cover rounded-lg hidden">
              <div id="meal-analysis-result" class="mt-4"></div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-comment mr-1"></i> 体調メモ
              </label>
              <textarea name="condition_note" rows="3" 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >${todayLog?.condition_note || ''}</textarea>
            </div>
            
            <button type="submit" class="w-full btn-primary px-6 py-3 rounded-lg font-bold text-lg">
              <i class="fas fa-save mr-2"></i>
              保存する
            </button>
          </form>
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
        <h2 class="text-3xl font-bold text-center mb-12">AIパーソナルジムの特徴</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="card-hover text-center p-8 bg-gray-50 rounded-lg">
            <div class="w-16 h-16 mx-auto mb-4 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
              <i class="fas fa-robot text-3xl" style="color: var(--color-primary)"></i>
            </div>
            <h3 class="text-xl font-bold mb-3">AI食事解析</h3>
            <p class="text-gray-600">
              写真を撮るだけでカロリーや栄養素を自動分析。面倒な入力作業は不要です。
            </p>
          </div>
          
          <div class="card-hover text-center p-8 bg-gray-50 rounded-lg">
            <div class="w-16 h-16 mx-auto mb-4 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
              <i class="fas fa-user-nurse text-3xl" style="color: var(--color-primary)"></i>
            </div>
            <h3 class="text-xl font-bold mb-3">プロのアドバイス</h3>
            <p class="text-gray-600">
              経験豊富なトレーナーと栄養士があなたのデータを分析し、個別アドバイスを提供。
            </p>
          </div>
          
          <div class="card-hover text-center p-8 bg-gray-50 rounded-lg">
            <div class="w-16 h-16 mx-auto mb-4 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
              <i class="fas fa-chart-line text-3xl" style="color: var(--color-primary)"></i>
            </div>
            <h3 class="text-xl font-bold mb-3">詳細な分析</h3>
            <p class="text-gray-600">
              体重・体脂肪率・食事の推移をグラフで可視化。目標達成をサポートします。
            </p>
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
        <h2 class="text-3xl font-bold text-center mb-12">よくある質問</h2>
        
        <div class="max-w-3xl mx-auto space-y-4">
          ${faqs.map((faq, index) => `
            <div class="bg-white rounded-lg shadow-sm overflow-hidden">
              <button onclick="toggleAccordion(this)" class="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition">
                <span class="font-bold text-lg">${faq.question}</span>
                <i class="fas fa-chevron-down accordion-icon transition-transform" style="color: var(--color-primary)"></i>
              </button>
              <div class="accordion-content px-6 pb-4">
                <p class="text-gray-600">${faq.answer}</p>
              </div>
            </div>
          `).join('')}
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
    <footer class="bg-gray-800 text-white py-8">
      <div class="container mx-auto px-4 text-center">
        <p class="mb-2">&copy; 2025 ファディー彦根 All rights reserved.</p>
        <p class="text-sm text-gray-400">AIパーソナルジム - あなたの健康をサポート</p>
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

// 健康ログ送信
async function handleHealthLogSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    log_date: dayjs().format('YYYY-MM-DD'),
    weight: formData.get('weight') ? parseFloat(formData.get('weight')) : null,
    body_fat_percentage: formData.get('body_fat_percentage') ? parseFloat(formData.get('body_fat_percentage')) : null,
    body_temperature: formData.get('body_temperature') ? parseFloat(formData.get('body_temperature')) : null,
    sleep_hours: formData.get('sleep_hours') ? parseFloat(formData.get('sleep_hours')) : null,
    exercise_minutes: formData.get('exercise_minutes') ? parseInt(formData.get('exercise_minutes')) : null,
    condition_note: formData.get('condition_note') || null,
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
      todayLog = response.data;
    }
  } catch (error) {
    showToast('保存に失敗しました', 'error');
  }
}

// 食事写真アップロード
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
