import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// إعدادات مشروعك في Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCQpu9uhiDkFLCmTStGTv1XtsT-dZQmYtM",
  authDomain: "codekids-dc27d.firebaseapp.com",
  databaseURL: "https://codekids-dc27d-default-rtdb.firebaseio.com",
  projectId: "codekids-dc27d",
  storageBucket: "codekids-dc27d.firebasestorage.app",
  messagingSenderId: "893671964534",
  appId: "1:893671964534:web:7b19b9120adacb7a314457",
  measurementId: "G-Y65DY8XSG0"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 1. تسجيل الطفل وحفظه في Firebase وتوليد الـ QR
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const token = 'CK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const childData = {
    fullName: document.getElementById('reg-name').value,
    age: Number(document.getElementById('reg-age').value),
    stage: document.getElementById('reg-stage').value,
    guardianName: document.getElementById('reg-guardian').value,
    guardianPhone: document.getElementById('reg-phone').value,
    qrToken: token,
    createdAt: new Date().toISOString()
  };

  try {
    const newChildRef = push(ref(db, 'children'));
    await set(newChildRef, childData);

    const qrContainer = document.getElementById('qrcode-container');
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
      text: token,
      width: 110,
      height: 110
    });

    document.getElementById('qr-result-box').classList.remove('hidden');
    document.getElementById('qr-token-label').innerText = `الكود المشفر: ${token}`;
    alert(`تم تسجيل الطفل ${childData.fullName} بنجاح!`);
  } catch (err) {
    alert('حدث خطأ أثناء الحفظ في قاعدة البيانات: ' + err.message);
  }
});

// 2. منطق لعبة قياس سرعة الاستجابة
let attempt = 1;
const totalAttempts = 5;
let roundStart = 0;
let reactionTimes = [];
let timer = null;

window.openTestModal = function() {
  document.getElementById('test-modal').classList.remove('hidden');
  resetGame();
};

window.closeTestModal = function() {
  clearTimeout(timer);
  document.getElementById('test-modal').classList.add('hidden');
  resetGame();
};

function resetGame() {
  attempt = 1;
  reactionTimes = [];
  document.getElementById('current-attempt').innerText = attempt;
  document.getElementById('target').classList.add('hidden');
  document.getElementById('arena-placeholder').classList.remove('hidden');
  document.getElementById('btn-start-round').classList.remove('hidden');
  document.getElementById('game-status').innerText = 'انقر على النجمة الذهبية فور ظهورها بأسرع ما يمكن!';
}

window.triggerNextRound = function() {
  document.getElementById('btn-start-round').classList.add('hidden');
  document.getElementById('arena-placeholder').innerText = 'ترقب الظهور...';

  const randomTime = Math.floor(Math.random() * 2000) + 800;
  timer = setTimeout(showTarget, randomTime);
};

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

window.onTargetClicked = function() {
  const reaction = Date.now() - roundStart;
  reactionTimes.push(reaction);
  document.getElementById('target').classList.add('hidden');

  if (attempt < totalAttempts) {
    attempt++;
    document.getElementById('current-attempt').innerText = attempt;
    document.getElementById('game-status').innerText = `ممتاز! السرعة: ${reaction} مللي ثانية ⚡`;
    window.triggerNextRound();
  } else {
    finishAssessment();
  }
};

async function finishAssessment() {
  document.getElementById('game-status').innerText = 'جارٍ إرسال النتائج للسحابة...';

  const totalTime = reactionTimes.reduce((a, b) => a + b, 0);
  const avgReaction = Math.round(totalTime / reactionTimes.length);

  let visualCoordination = 'طبيعي ومستقر';
  let focusStatus = 'تركيز جيد';

  if (avgReaction < 550) {
    visualCoordination = 'تآزر بصري فائق وسرعة بديهة 🌟';
    focusStatus = 'انتباه وتيقظ عالي';
  } else if (avgReaction > 1100) {
    visualCoordination = 'يحتاج إلى تدريب لتقوية التآزر الحركي';
    focusStatus = 'مؤشرات تشتت انتباه طفيفة';
  }

  const childName = document.getElementById('reg-name').value || 'طفل تجريبي';

  try {
    const newTestRef = push(ref(db, 'test_results'));
    await set(newTestRef, {
      childName,
      avgReactionMs: avgReaction,
      accuracyScore: 100,
      visualCoordination,
      focusStatus,
      createdAt: new Date().toISOString()
    });

    alert(`انتهى الاختبار! النتيجة: ${visualCoordination}`);
    window.closeTestModal();
  } catch (err) {
    alert('حدث خطأ في حفظ النتيجة: ' + err.message);
  }
}

// 3. الاستماع التلقائي المباشر (Realtime) لنتائج الفحص وعرضها
const testsRef = ref(db, 'test_results');
onValue(testsRef, (snapshot) => {
  const tbody = document.getElementById('results-table');
  const data = snapshot.val();

  if (!data) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-slate-400 text-xs">لا توجد نتائج مسجلة حتى الآن.</td></tr>`;
    return;
  }

  const list = Object.values(data).reverse();
  tbody.innerHTML = list.map(item => `
    <tr class="hover:bg-slate-50 transition-colors">
      <td class="py-2.5 px-3 font-bold text-slate-900">${item.childName}</td>
      <td class="py-2.5 px-3 font-semibold text-brand-indigo">${item.avgReactionMs} ms</td>
      <td class="py-2.5 px-3 font-bold text-emerald-600">${item.accuracyScore}%</td>
      <td class="py-2.5 px-3 text-xs">${item.visualCoordination}</td>
      <td class="py-2.5 px-3 text-xs"><span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">${item.focusStatus}</span></td>
      <td class="py-2.5 px-3 text-xs text-slate-400">${new Date(item.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</td>
    </tr>
  `).join('');
});
