const API_URL = 'http://localhost:5000/api';

// 1. تسجيل الطفل وحفظه
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const payload = {
    fullName: document.getElementById('reg-name').value,
    age: document.getElementById('reg-age').value,
    stage: document.getElementById('reg-stage').value,
    guardianName: document.getElementById('reg-guardian').value,
    guardianPhone: document.getElementById('reg-phone').value,
  };

  try {
    const res = await fetch(`${API_URL}/children/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.child) {
      document.getElementById('qr-result-box').classList.remove('hidden');
      document.getElementById('qr-image').src = data.qrImage;
      document.getElementById('qr-token-label').innerText = data.child.qrToken;
      alert(`تم تسجيل ${data.child.fullName} بنجاح!`);
    }
  } catch (err) {
    alert('تعذر الاتصال بالخادم. تأكد من تشغيل الـ Backend.');
  }
});

// 2. منطق لعبة قياس سرعة الاستجابة
let attempt = 1;
const totalAttempts = 5;
let roundStart = 0;
let reactionTimes = [];
let timer = null;

function openTestModal() {
  document.getElementById('test-modal').classList.remove('hidden');
  resetGame();
}

function closeTestModal() {
  clearTimeout(timer);
  document.getElementById('test-modal').classList.add('hidden');
  resetGame();
}

function resetGame() {
  attempt = 1;
  reactionTimes = [];
  document.getElementById('current-attempt').innerText = attempt;
  document.getElementById('target').classList.add('hidden');
  document.getElementById('arena-placeholder').classList.remove('hidden');
  document.getElementById('btn-start-round').classList.remove('hidden');
  document.getElementById('game-status').innerText = 'انقر على النجمة الذهبية فور ظهورها بأسرع ما يمكن!';
}

function triggerNextRound() {
  document.getElementById('btn-start-round').classList.add('hidden');
  document.getElementById('arena-placeholder').innerText = 'ترقب الظهور...';

  const randomTime = Math.floor(Math.random() * 2000) + 800;
  timer = setTimeout(showTarget, randomTime);
}

function showTarget() {
  const arena = document.getElementById('arena');
  const target = document.getElementById('target');
  document.getElementById('arena-placeholder').classList.add('hidden');

  const x = Math.floor(Math.random() * (arena.clientWidth - 70));
  const y = Math.floor(Math.random() * (arena.clientHeight - 70));

  target.style.left = `${x}px`;
  target.style.top = `${y}px`;
  target.classList.remove('hidden');

  roundStart = Date.now();
}

function onTargetClicked() {
  const reaction = Date.now() - roundStart;
  reactionTimes.push(reaction);
  document.getElementById('target').classList.add('hidden');

  if (attempt < totalAttempts) {
    attempt++;
    document.getElementById('current-attempt').innerText = attempt;
    document.getElementById('game-status').innerText = `ممتاز! السرعة: ${reaction} مللي ثانية ⚡`;
    triggerNextRound();
  } else {
    finishAssessment();
  }
}

async function finishAssessment() {
  document.getElementById('game-status').innerText = 'جارٍ معالجة النتائج وإرسالها للسحابة...';

  const childName = document.getElementById('reg-name').value || 'طفل تجريبي';

  try {
    const res = await fetch(`${API_URL}/tests/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childName,
        reactionTimes,
        accuracyScore: 100
      })
    });
    const result = await res.json();
    alert(`انتهى الاختبار! نتيجة التآزر: ${result.result.visualCoordination}`);
    closeTestModal();
    loadResults();
  } catch (err) {
    alert('حدث خطأ أثناء حفظ النتائج.');
  }
}

// 3. جلب السجلات وعرضها
async function loadResults() {
  const tbody = document.getElementById('results-table');
  try {
    const res = await fetch(`${API_URL}/tests/all`);
    const data = await res.json();

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-slate-400 text-xs">لا توجد نتائج مسجلة حتى الآن.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(item => `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-2.5 px-3 font-bold text-slate-900">${item.childName}</td>
        <td class="py-2.5 px-3 font-semibold text-brand-indigo">${item.avgReactionMs} ms</td>
        <td class="py-2.5 px-3 font-bold text-emerald-600">${item.accuracyScore}%</td>
        <td class="py-2.5 px-3 text-xs">${item.visualCoordination}</td>
        <td class="py-2.5 px-3 text-xs"><span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">${item.focusStatus}</span></td>
        <td class="py-2.5 px-3 text-xs text-slate-400">${new Date(item.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-rose-500 text-xs">تعذر جلب البيانات. يرجى تشغيل الـ Backend.</td></tr>`;
  }
}

window.addEventListener('DOMContentLoaded', loadResults);
