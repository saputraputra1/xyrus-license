const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Gunakan POST' });

  const { licenseKey, hwid } = req.body;
  if (!licenseKey || !hwid) return res.status(400).json({ success: false, message: 'Parameter tidak lengkap' });

  try {
    const docRef = db.collection('licenses').doc(licenseKey);
    const doc = await docRef.get();

    if (!doc.exists) return res.json({ success: false, message: 'Key Tidak Valid' });

    const license = doc.data();

    if (license.status !== 'active') return res.json({ success: false, message: 'Key ' + license.status });

    // Locking HWID saat aktivasi pertama
    if (!license.hwid) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (license.durationDays || 30));
      await docRef.update({
        hwid: hwid,
        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt)
      });
      return res.json({ success: true, message: 'Aktivasi Berhasil', expiresAt });
    }

    if (license.hwid !== hwid) return res.json({ success: false, message: 'HWID Berbeda!' });

    if (license.expiresAt.toDate() < new Date()) {
      await docRef.update({ status: 'expired' });
      return res.json({ success: false, message: 'Key Kadaluarsa' });
    }

    return res.json({ success: true, message: 'Valid', expiresAt: license.expiresAt.toDate() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}
