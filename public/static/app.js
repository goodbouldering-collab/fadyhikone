// ファディー彦根 - トップページ

// ========== グローバル変数 ==========
let currentUser = null;
let authToken = null;

// ========== ユーティリティ関数 ==========

// ローディング表示
function showLoading() {
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.className = 'loading-overlay';
  overlay.innerHTML = '<div class="spinner spinner-lg"></div>';
  document.body.appendChild(overlay);
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.remove();
  }
}

// API リクエスト
async function apiRequest(url, options = {}) {
  showLoading();
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await axios({
      url,
      method: options.method || 'GET',
      headers,
      data: options.body,
      ...options,
    });

    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    if (error.response) {
      throw new Error(error.response.data.error || 'リクエストに失敗しました');
    }
    throw error;
  } finally {
    hideLoading();
  }
}

// トークンからユーザー情報取得
async function loadUserFromToken() {
  if (!authToken) return null;

  try {
    const result = await apiRequest('/api/auth/me');
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Failed to load user:', error);
    return null;
  }
}

// ========== 認証機能 ==========

async function handleGoogleLogin() {
  try {
    const result = await apiRequest('/api/auth/google');
    if (result.success) {
      window.location.href = result.data.authUrl;
    }
  } catch (error) {
    alert('Google ログインに失敗しました: ' + error.message);
  }
}

async function handleLineLogin() {
  try {
    const result = await apiRequest('/api/auth/line');
    if (result.success) {
      window.location.href = result.data.authUrl;
    }
  } catch (error) {
    alert('LINE ログインに失敗しました: ' + error.message);
  }
}

function handleLogout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  location.reload();
}

// ========== スタッフアドバイス ==========

async function loadStaffAdvices() {
  if (!currentUser) return;

  try {
    const result = await apiRequest('/api/advices?limit=5');
    
    if (result.success && result.data.length > 0) {
      displayStaffAdvices(result.data);
    }
  } catch (error) {
    console.error('Failed to load advices:', error);
  }
}

function displayStaffAdvices(advices) {
  const container = document.getElementById('staff-advices');
  if (!container) return;

  container.innerHTML = advices.map(advice => `
    <div class="card mb-3">
      <div class="flex items-start gap-4">
        <div class="flex-shrink-0">
          <i class="fas fa-user-md text-3xl text-primary"></i>
        </div>
        <div class="flex-1">
          <div class="flex justify-between items-start mb-2">
            <div>
              <h4 class="font-semibold text-lg text-gray-800">${advice.staff_name}</h4>
              <span class="badge badge-primary">${getAdviceTypeLabel(advice.advice_type)}</span>
            </div>
            <span class="text-sm text-gray-500">${dayjs(advice.created_at).format('YYYY/MM/DD HH:mm')}</span>
          </div>
          <p class="text-gray-700 leading-relaxed">${advice.advice_text}</p>
        </div>
      </div>
    </div>
  `).join('');
}

function getAdviceTypeLabel(type) {
  const labels = {
    diet: '食事',
    exercise: '運動',
    lifestyle: '生活習慣',
    general: '総合',
  };
  return labels[type] || type;
}

// ========== 健康ログ入力 ==========

async function handleHealthLogSubmit(event) {
  event.preventDefault();

  if (!currentUser) {
    alert('ログインしてください');
    return;
  }

  const formData = new FormData(event.target);
  const data = {
    log_date: formData.get('log_date') || new Date().toISOString().split('T')[0],
    weight: formData.get('weight') ? parseFloat(formData.get('weight')) : null,
    body_fat_percentage: formData.get('body_fat_percentage') ? parseFloat(formData.get('body_fat_percentage')) : null,
    muscle_mass: formData.get('muscle_mass') ? parseFloat(formData.get('muscle_mass')) : null,
    meal_type: formData.get('meal_type') || null,
    meal_description: formData.get('meal_description') || null,
    exercise_type: formData.get('exercise_type') || null,
    exercise_duration: formData.get('exercise_duration') ? parseInt(formData.get('exercise_duration')) : null,
    sleep_hours: formData.get('sleep_hours') ? parseFloat(formData.get('sleep_hours')) : null,
    mood: formData.get('mood') || null,
    notes: formData.get('notes') || null,
  };

  try {
    const result = await apiRequest('/api/health-logs', {
      method: 'POST',
      body: data,
    });

    if (result.success) {
      alert('健康ログを登録しました！');
      event.target.reset();
      loadStaffAdvices(); // アドバイスを再読み込み
    }
  } catch (error) {
    alert('ログの登録に失敗しました: ' + error.message);
  }
}

// 写真アップロード
async function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!currentUser) {
    alert('ログインしてください');
    return;
  }

  const formData = new FormData();
  formData.append('image', file);

  showLoading();

  try {
    const response = await axios.post('/api/health-logs/upload-image', formData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success) {
      const { imageUrl, analysis } = response.data.data;
      
      // AI解析結果を表示
      document.getElementById('ai-analysis-result').innerHTML = `
        <div class="alert alert-info">
          <h4 class="font-semibold mb-2"><i class="fas fa-robot mr-2"></i>AI解析結果</h4>
          <p>${analysis}</p>
          <img src="${imageUrl}" alt="アップロード画像" class="mt-3 rounded-lg max-w-full h-auto" />
        </div>
      `;
    }
  } catch (error) {
    alert('画像のアップロードに失敗しました: ' + (error.response?.data?.error || error.message));
  } finally {
    hideLoading();
  }
}

// ========== 問い合わせフォーム ==========

async function handleInquirySubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const data = {
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    subject: formData.get('subject'),
    message: formData.get('message'),
  };

  try {
    const result = await apiRequest('/api/inquiries', {
      method: 'POST',
      body: data,
    });

    if (result.success) {
      alert('お問い合わせを送信しました。ご連絡をお待ちください。');
      event.target.reset();
    }
  } catch (error) {
    alert('お問い合わせの送信に失敗しました: ' + error.message);
  }
}

// ========== ページレンダリング ==========

function renderPage() {
  const root = document.getElementById('root');

  root.innerHTML = `
    <!-- ヘッダー -->
    <header class="bg-white shadow-md sticky top-0 z-50">
      <div class="container mx-auto px-4 py-4">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <i class="fas fa-dumbbell text-3xl text-primary"></i>
            <h1 class="text-2xl font-bold text-gray-800">ファディー彦根</h1>
          </div>
          <nav class="flex items-center gap-4">
            ${currentUser ? `
              <a href="/mypage" class="btn btn-outline">
                <i class="fas fa-user"></i> マイページ
              </a>
              ${currentUser.role === 'admin' ? `
                <a href="/admin" class="btn btn-secondary">
                  <i class="fas fa-cog"></i> 管理画面
                </a>
              ` : ''}
              <button onclick="handleLogout()" class="btn btn-primary">
                <i class="fas fa-sign-out-alt"></i> ログアウト
              </button>
            ` : `
              <button onclick="handleGoogleLogin()" class="btn btn-outline">
                <i class="fab fa-google"></i> Googleでログイン
              </button>
              <button onclick="handleLineLogin()" class="btn btn-primary">
                <i class="fab fa-line"></i> LINEでログイン
              </button>
            `}
          </nav>
        </div>
      </div>
    </header>

    <!-- メインコンテンツ -->
    <main>
      <!-- Hero Section -->
      <section class="bg-gradient-to-r from-pink-100 to-purple-100 py-20">
        <div class="container mx-auto px-4 text-center">
          <h2 class="text-5xl font-bold text-gray-800 mb-6">
            AIとスタッフが支える<br />あなただけの健康管理
          </h2>
          <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            体重・食事・運動を記録するだけで、AIが自動分析。<br />
            専門スタッフからの個別アドバイスで、理想の体へ。
          </p>
          ${!currentUser ? `
            <div class="flex gap-4 justify-center">
              <button onclick="handleGoogleLogin()" class="btn btn-primary btn-lg">
                <i class="fab fa-google mr-2"></i> 今すぐ始める
              </button>
            </div>
          ` : ''}
        </div>
      </section>

      ${currentUser ? `
        <!-- スタッフアドバイスセクション -->
        <section class="container mx-auto px-4 py-12">
          <h3 class="text-3xl font-bold text-gray-800 mb-6">
            <i class="fas fa-comments text-primary mr-2"></i> スタッフからのアドバイス
          </h3>
          <div id="staff-advices">
            <p class="text-gray-500 text-center py-8">アドバイスを読み込み中...</p>
          </div>
        </section>

        <!-- 健康ログ入力セクション -->
        <section class="bg-white py-12">
          <div class="container mx-auto px-4">
            <h3 class="text-3xl font-bold text-gray-800 mb-6">
              <i class="fas fa-notes-medical text-primary mr-2"></i> 今日の健康ログ
            </h3>
            
            <div class="card max-w-4xl mx-auto">
              <form id="health-log-form" onsubmit="handleHealthLogSubmit(event)">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div class="form-group">
                    <label class="form-label">体重 (kg)</label>
                    <input type="number" step="0.1" name="weight" class="form-input" placeholder="58.5" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">体脂肪率 (%)</label>
                    <input type="number" step="0.1" name="body_fat_percentage" class="form-input" placeholder="22.3" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">筋肉量 (kg)</label>
                    <input type="number" step="0.1" name="muscle_mass" class="form-input" placeholder="42.1" />
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div class="form-group">
                    <label class="form-label">食事の種類</label>
                    <select name="meal_type" class="form-select">
                      <option value="">選択してください</option>
                      <option value="breakfast">朝食</option>
                      <option value="lunch">昼食</option>
                      <option value="dinner">夕食</option>
                      <option value="snack">間食</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">食事内容</label>
                    <input type="text" name="meal_description" class="form-input" placeholder="例: 納豆ご飯、味噌汁" />
                  </div>
                </div>

                <div class="form-group mb-6">
                  <label class="form-label">
                    <i class="fas fa-camera mr-2"></i> 食事写真をアップロード（AI解析）
                  </label>
                  <input type="file" accept="image/*" onchange="handlePhotoUpload(event)" class="form-input" />
                  <div id="ai-analysis-result" class="mt-3"></div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div class="form-group">
                    <label class="form-label">運動の種類</label>
                    <input type="text" name="exercise_type" class="form-input" placeholder="例: ジョギング" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">運動時間 (分)</label>
                    <input type="number" name="exercise_duration" class="form-input" placeholder="30" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">睡眠時間 (時間)</label>
                    <input type="number" step="0.5" name="sleep_hours" class="form-input" placeholder="7.5" />
                  </div>
                </div>

                <div class="form-group mb-6">
                  <label class="form-label">今日の気分</label>
                  <select name="mood" class="form-select">
                    <option value="">選択してください</option>
                    <option value="excellent">最高</option>
                    <option value="good">良い</option>
                    <option value="normal">普通</option>
                    <option value="bad">悪い</option>
                    <option value="terrible">最悪</option>
                  </select>
                </div>

                <div class="form-group mb-6">
                  <label class="form-label">メモ</label>
                  <textarea name="notes" class="form-textarea" placeholder="今日の体調や気づいたことなど..."></textarea>
                </div>

                <button type="submit" class="btn btn-primary w-full">
                  <i class="fas fa-save mr-2"></i> ログを保存
                </button>
              </form>
            </div>
          </div>
        </section>
      ` : ''}

      <!-- AIパーソナルジムの良さ -->
      <section class="container mx-auto px-4 py-12">
        <h3 class="text-3xl font-bold text-gray-800 mb-6 text-center">
          ファディー彦根の特徴
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="card text-center">
            <div class="text-5xl text-primary mb-4">
              <i class="fas fa-robot"></i>
            </div>
            <h4 class="text-xl font-semibold mb-3">AI自動解析</h4>
            <p class="text-gray-600">
              食事写真をアップロードするだけで、AIが自動でカロリーや栄養バランスを分析します。
            </p>
          </div>
          <div class="card text-center">
            <div class="text-5xl text-primary mb-4">
              <i class="fas fa-user-friends"></i>
            </div>
            <h4 class="text-xl font-semibold mb-3">専門スタッフサポート</h4>
            <p class="text-gray-600">
              トレーナーや栄養士が、あなたのデータを見て個別にアドバイス。一人ひとりに最適なサポートを提供します。
            </p>
          </div>
          <div class="card text-center">
            <div class="text-5xl text-primary mb-4">
              <i class="fas fa-chart-line"></i>
            </div>
            <h4 class="text-xl font-semibold mb-3">見える化で継続</h4>
            <p class="text-gray-600">
              体重・体脂肪率の変化をグラフで可視化。進捗が見えるから、モチベーションが続きます。
            </p>
          </div>
        </div>
      </section>

      <!-- FAQ -->
      <section class="bg-white py-12">
        <div class="container mx-auto px-4">
          <h3 class="text-3xl font-bold text-gray-800 mb-6 text-center">
            よくある質問
          </h3>
          <div class="max-w-3xl mx-auto">
            ${renderFAQ()}
          </div>
        </div>
      </section>

      <!-- 問い合わせフォーム -->
      <section class="container mx-auto px-4 py-12">
        <h3 class="text-3xl font-bold text-gray-800 mb-6 text-center">
          お問い合わせ
        </h3>
        <div class="card max-w-2xl mx-auto">
          <form onsubmit="handleInquirySubmit(event)">
            <div class="form-group">
              <label class="form-label">お名前 <span class="text-red-500">*</span></label>
              <input type="text" name="name" required class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">メールアドレス <span class="text-red-500">*</span></label>
              <input type="email" name="email" required class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">電話番号</label>
              <input type="tel" name="phone" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">件名 <span class="text-red-500">*</span></label>
              <input type="text" name="subject" required class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">お問い合わせ内容 <span class="text-red-500">*</span></label>
              <textarea name="message" required class="form-textarea"></textarea>
            </div>
            <button type="submit" class="btn btn-primary w-full">
              <i class="fas fa-paper-plane mr-2"></i> 送信する
            </button>
          </form>
        </div>
      </section>
    </main>

    <!-- フッター -->
    <footer class="bg-gray-800 text-white py-8">
      <div class="container mx-auto px-4 text-center">
        <p>&copy; 2024 ファディー彦根. All rights reserved.</p>
        <div class="mt-4">
          <a href="#" class="text-white hover:text-primary mx-2">プライバシーポリシー</a>
          <a href="#" class="text-white hover:text-primary mx-2">利用規約</a>
        </div>
      </div>
    </footer>
  `;
}

function renderFAQ() {
  const faqs = [
    {
      question: 'AIパーソナルジムとは何ですか？',
      answer: '体重・食事・運動などの健康データを入力すると、AIが自動で分析し、改善点を提案します。さらに、専門スタッフが個別にアドバイスを提供する、次世代型のパーソナルジムです。',
    },
    {
      question: '料金はいくらですか？',
      answer: '月額9,900円（税込）で、AIパーソナルトレーニング、食事管理、専門スタッフによるアドバイスが受けられます。初月は入会金5,500円が別途かかります。',
    },
    {
      question: 'スマートフォンだけで利用できますか？',
      answer: 'はい。スマートフォン、タブレット、PCのどれからでもアクセス可能です。アプリのダウンロードは不要で、Webブラウザから簡単にご利用いただけます。',
    },
    {
      question: '食事写真のAI解析はどれくらい正確ですか？',
      answer: '最新のAI技術により、約85%以上の精度でカロリーや栄養素を推定します。ただし、あくまで目安としてご利用ください。',
    },
  ];

  return faqs.map((faq, index) => `
    <div class="accordion-item">
      <div class="accordion-header" onclick="toggleAccordion(${index})">
        <h4 class="font-semibold text-gray-800">${faq.question}</h4>
        <i class="fas fa-chevron-down transition-transform" id="faq-icon-${index}"></i>
      </div>
      <div class="accordion-content" id="faq-content-${index}">
        <p class="text-gray-600">${faq.answer}</p>
      </div>
    </div>
  `).join('');
}

function toggleAccordion(index) {
  const content = document.getElementById(`faq-content-${index}`);
  const icon = document.getElementById(`faq-icon-${index}`);
  
  content.classList.toggle('active');
  icon.style.transform = content.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
}

// ========== 初期化 ==========

async function init() {
  // URL パラメータからトークン取得
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');
  
  if (tokenFromUrl) {
    authToken = tokenFromUrl;
    localStorage.setItem('authToken', tokenFromUrl);
    // URLからトークンを削除
    window.history.replaceState({}, document.title, '/');
  } else {
    // ローカルストレージからトークン取得
    authToken = localStorage.getItem('authToken');
  }

  // ユーザー情報読み込み
  if (authToken) {
    currentUser = await loadUserFromToken();
    if (!currentUser) {
      // トークンが無効な場合は削除
      localStorage.removeItem('authToken');
      authToken = null;
    }
  }

  // ページレンダリング
  renderPage();

  // ログインしている場合はスタッフアドバイス読み込み
  if (currentUser) {
    loadStaffAdvices();
  }
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', init);
