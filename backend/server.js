const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const QRCode = require('qrcode');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// الاتصال المباشر بقاعدة بيانات Firebase Realtime
admin.initializeApp({
  databaseURL: process.env.FIREBASE_DB_URL
});
const db = admin.database();

// فحص عمل الخادم
app.get('/', (req, res) => {
  res.send('خادم منصة Code Kids السحابي يعمل بنجاح 🚀');
});

// 1. مسار تسجيل طفل وتوليد رمز QR مشفر خاص به
app.post('/api/children/register', async (req, res) => {
  try {
    const { fullName, age, stage, guardianName, guardianPhone } = req.body;
    const qrToken = 'CK-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    // توليد صورة الـ QR Code
    const qrImage = await QRCode.toDataURL(qrToken);

    // الحفظ في Firebase تحت جدول /children
    const childRef = db.ref('children').push();
    const childData = {
      id: childRef.key,
      fullName,
      age: Number(age),
      stage,
      guardianName,
      guardianPhone,
      qrToken,
      createdAt: new Date().toISOString()
    };

    await childRef.set(childData);

    res.status(201).json({
      message: 'تم تسجيل الطفل وتوليد الرمز بنجاح',
      child: childData,
      qrImage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. مسار إرسال نتائج فحص التآزر البصري وردود الفعل وتحليلها
app.post('/api/tests/submit', async (req, res) => {
  try {
    const { childId, childName, reactionTimes, accuracyScore } = req.body;

    const totalTime = reactionTimes.reduce((a, b) => a + b, 0);
    const avgReaction = Math.round(totalTime / reactionTimes.length);

    // خوارزمية استخراج المؤشرات النمائية
    let visualCoordination = 'طبيعي ومستقر';
    let focusStatus = 'تركيز جيد';

    if (avgReaction < 550 && accuracyScore >= 80) {
      visualCoordination = 'تآزر بصري حركي فائق وسرعة بديهة 🌟';
      focusStatus = 'انتباه وتيقظ عالي';
    } else if (avgReaction > 1100 || accuracyScore < 60) {
      visualCoordination = 'يحتاج إلى أنشطة تدريبية لتقوية التآزر الحركي';
      focusStatus = 'مؤشرات تشتت انتباه طفيفة';
    }

    const testRef = db.ref('test_results').push();
    const resultPayload = {
      id: testRef.key,
      childId: childId || 'GUEST',
      childName: childName || 'طفل تجريبي',
      avgReactionMs: avgReaction,
      accuracyScore,
      reactionTimes,
      visualCoordination,
      focusStatus,
      createdAt: new Date().toISOString()
    };

    await testRef.set(resultPayload);

    res.status(201).json({
      message: 'تم تخزين وتحليل الاختبار بنجاح',
      result: resultPayload
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. مسار جلب جميع السجلات للوحة تحكم الأخصائي
app.get('/api/tests/all', async (req, res) => {
  try {
    const snapshot = await db.ref('test_results').once('value');
    const data = snapshot.val() || {};
    const list = Object.values(data).reverse();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 خادم الباك إند يعمل على المنفذ: http://localhost:${PORT}`);
});
