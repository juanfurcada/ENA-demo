// ===== DOM references =====
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');
const resetBtn = document.getElementById('reset-btn');
const logoutBtn = document.getElementById('logout-btn');

// ===== Toggle password visibility =====
const togglePw = document.getElementById('toggle-pw');
const pwInput = document.getElementById('password');
togglePw.addEventListener('click', () => {
  const isHidden = pwInput.type === 'password';
  pwInput.type = isHidden ? 'text' : 'password';
  togglePw.querySelector('.eye-open').style.display = isHidden ? 'none' : 'block';
  togglePw.querySelector('.eye-closed').style.display = isHidden ? 'block' : 'none';
});

// ===== Login =====
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  const btn = loginForm.querySelector('.login-btn');
  const btnText = btn.querySelector('.btn-text');
  const btnLoader = btn.querySelector('.btn-loader');
  btnText.style.display = 'none';
  btnLoader.style.display = 'inline-flex';
  btn.disabled = true;
  errorMsg.textContent = '';
  errorMsg.classList.remove('visible');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 403) {
        errorMsg.innerHTML = 'Tu cuenta está bloqueada. Contactá a soporte <a href="#" id="open-plug-link">acá</a>.';
        errorMsg.classList.add('visible');
        setTimeout(() => {
          document.getElementById('open-plug-link').addEventListener('click', (ev) => {
            ev.preventDefault();
            try {
              if (window.plugSDK) {
                window.plugSDK.toggleWidget(true, 'create_conversation', {
                  startConversationContent: "Hola, no puedo acceder a mi cuenta, me sale el error \"bloqueada\""
                });
              }
            } catch(e) { console.error('Plug SDK error:', e); }
          });
        }, 50);
        loginForm.classList.add('shake');
        setTimeout(() => loginForm.classList.remove('shake'), 500);
        return;
      }
      throw new Error(data.error || 'Error al iniciar sesión');
    }

    showDashboard(data.user);
  } catch (err) {
    errorMsg.textContent = err.message;
    errorMsg.classList.add('visible');
    loginForm.classList.add('shake');
    setTimeout(() => loginForm.classList.remove('shake'), 500);
  } finally {
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
    btn.disabled = false;
  }
});

// ===== Show Dashboard =====
function showDashboard(user) {
  loginScreen.classList.remove('active');
  dashboardScreen.classList.add('active');

  const initials = user.name.split(' ').map(n => n[0]).join('');
  document.getElementById('user-avatar').textContent = initials;
  document.getElementById('nav-user-name').textContent = user.name;
  document.getElementById('nav-user-role').textContent = user.role;
  document.getElementById('dash-user-name').textContent = user.name.split(' ')[0];

  document.getElementById('stat-certs').textContent = user.certifications.length;
  const activeCourses = user.enrolledCourses.filter(c => c.status === 'in-progress').length;
  document.getElementById('stat-courses').textContent = activeCourses;

  // Supplements grid
  const grid = document.getElementById('courses-grid');
  grid.innerHTML = '';
  user.enrolledCourses.forEach(course => {
    const statusLabel = {
      'in-progress': 'En consumo',
      'completed': 'Terminado',
      'not-started': 'Sin abrir',
    }[course.status];

    const card = document.createElement('div');
    card.className = `course-card status-${course.status}`;
    card.innerHTML = `
      <div class="course-top">
        <span class="course-id">${course.id}</span>
        <span class="course-status ${course.status}">${statusLabel}</span>
      </div>
      <h3 class="course-name">${course.name}</h3>
      <div class="progress-section">
        <div class="progress-header">
          <span>Restante</span>
          <span class="progress-pct">${course.progress}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${course.progress}%"></div>
        </div>
      </div>
      <button class="course-btn ${course.status === 'completed' ? 'review' : ''}">
        ${course.status === 'completed' ? 'Recomprar' : course.status === 'in-progress' ? 'Reponer ahora' : 'Empezar plan'}
      </button>
    `;
    grid.appendChild(card);
  });

  // Achievements
  const certsRow = document.getElementById('certs-row');
  certsRow.innerHTML = '';
  const certNames = {
    'CHFI': 'Constancia 90 días',
    'CSA': 'Cliente Premium ENA',
    'CEH': 'Plan Performance completado',
    'CND': 'Hábito saludable',
    'CPENT': 'Atleta ENA',
  };
  const achievementLabels = {
    'CHFI': '90 DÍAS',
    'CSA': 'PREMIUM',
    'CEH': 'PERFORMANCE',
    'CND': 'HÁBITO',
    'CPENT': 'ATLETA',
  };
  const achievementIcons = {
    'CHFI': '★',
    'CSA': '◆',
    'CEH': '▲',
    'CND': '●',
    'CPENT': '✦',
  };
  user.certifications.forEach(cert => {
    const el = document.createElement('div');
    el.className = 'cert-card';
    el.innerHTML = `
      <div class="cert-badge">${achievementIcons[cert] || '★'}</div>
      <div class="cert-info">
        <span class="cert-id">${achievementLabels[cert] || cert}</span>
        <span class="cert-name">${certNames[cert] || cert}</span>
      </div>
    `;
    certsRow.appendChild(el);
  });
}

// ===== Logout =====
logoutBtn.addEventListener('click', () => {
  dashboardScreen.classList.remove('active');
  loginScreen.classList.add('active');
  loginForm.reset();
  errorMsg.textContent = '';
  errorMsg.classList.remove('visible');
});

// ===== Reset Demo =====
resetBtn.addEventListener('click', async () => {
  try {
    await fetch('/api/reset', { method: 'POST' });
    errorMsg.textContent = '';
    errorMsg.classList.remove('visible');
    loginForm.reset();
    resetBtn.classList.add('spin');
    setTimeout(() => resetBtn.classList.remove('spin'), 600);
  } catch (err) {
    console.error('Reset failed', err);
  }
});
