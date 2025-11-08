// ユーティリティ関数集

// ローカルストレージからトークン取得
function getToken() {
  return localStorage.getItem('auth_token');
}

// ローカルストレージにトークン保存
function setToken(token) {
  localStorage.setItem('auth_token', token);
}

// トークン削除
function removeToken() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
}

// ユーザーデータ取得
function getUserData() {
  const data = localStorage.getItem('user_data');
  return data ? JSON.parse(data) : null;
}

// ユーザーデータ保存
function setUserData(userData) {
  localStorage.setItem('user_data', JSON.stringify(userData));
}

// 認証状態確認
function isAuthenticated() {
  return !!getToken();
}

// 管理者かどうか確認
function isAdmin() {
  const user = getUserData();
  return user && user.role === 'admin';
}

// ログアウト
function logout() {
  removeToken();
  window.location.href = '/';
}

// API呼び出しヘルパー (ローディング表示付き)
async function apiCall(url, options = {}) {
  showLoading();
  
  try {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await axios({
      url,
      method: options.method || 'GET',
      headers,
      data: options.data,
      ...options,
    });
    
    hideLoading();
    return response.data;
  } catch (error) {
    hideLoading();
    
    // 401エラーの場合、ログアウト
    if (error.response && error.response.status === 401) {
      showToast('セッションが切れました。再度ログインしてください。', 'error');
      setTimeout(() => {
        logout();
      }, 2000);
    }
    
    throw error;
  }
}

// ローディング表示
function showLoading() {
  const existingOverlay = document.getElementById('loading-overlay');
  if (existingOverlay) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.className = 'loading-overlay';
  overlay.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(overlay);
}

// ローディング非表示
function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.remove();
  }
}

// トースト通知
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg text-white transform transition-all duration-300 translate-x-full`;
  
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };
  
  toast.classList.add(colors[type] || colors.info);
  toast.innerHTML = `
    <div class="flex items-center gap-3">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // アニメーション
  setTimeout(() => {
    toast.classList.remove('translate-x-full');
  }, 100);
  
  // 3秒後に削除
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// 日付フォーマット
function formatDate(dateString) {
  return dayjs(dateString).format('YYYY年MM月DD日');
}

// 日時フォーマット
function formatDateTime(dateString) {
  return dayjs(dateString).format('YYYY年MM月DD日 HH:mm');
}

// 相対時間表示
function formatRelativeTime(dateString) {
  const now = dayjs();
  const target = dayjs(dateString);
  const diffMinutes = now.diff(target, 'minute');
  
  if (diffMinutes < 1) return 'たった今';
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  
  const diffHours = now.diff(target, 'hour');
  if (diffHours < 24) return `${diffHours}時間前`;
  
  const diffDays = now.diff(target, 'day');
  if (diffDays < 7) return `${diffDays}日前`;
  
  return formatDate(dateString);
}

// モーダル表示
function showModal(title, content, onConfirm = null) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold">${title}</h3>
        <button onclick="this.closest('.modal-backdrop').remove()" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="mb-6">${content}</div>
      <div class="flex justify-end gap-3">
        <button onclick="this.closest('.modal-backdrop').remove()" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">
          キャンセル
        </button>
        ${onConfirm ? '<button id="modal-confirm-btn" class="px-4 py-2 bg-primary text-white hover:bg-opacity-90 rounded-lg">確認</button>' : ''}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  if (onConfirm) {
    document.getElementById('modal-confirm-btn').onclick = () => {
      onConfirm();
      modal.remove();
    };
  }
  
  // 背景クリックで閉じる
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
}

// アコーディオントグル
function toggleAccordion(element) {
  const content = element.nextElementSibling;
  const icon = element.querySelector('.accordion-icon');
  
  if (content.classList.contains('open')) {
    content.classList.remove('open');
    icon.style.transform = 'rotate(0deg)';
  } else {
    content.classList.add('open');
    icon.style.transform = 'rotate(180deg)';
  }
}

// ファイルプレビュー
function previewImage(input, previewElementId) {
  const file = input.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById(previewElementId);
      preview.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
}

// バリデーション
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePhone(phone) {
  const re = /^[0-9]{2,4}-[0-9]{2,4}-[0-9]{3,4}$/;
  return re.test(phone) || /^[0-9]{10,11}$/.test(phone.replace(/-/g, ''));
}

// グラフ描画ヘルパー
function createLineChart(canvasId, labels, data, label) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: data,
        borderColor: '#FF6B9D',
        backgroundColor: 'rgba(255, 107, 157, 0.1)',
        tension: 0.4,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        y: {
          beginAtZero: false,
        }
      }
    }
  });
}
