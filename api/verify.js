const admin = require('firebase-admin');

// Inisialisasi Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { licenseKey, hwid } = req.body;

  try {
    const docRef = db.collection('licenses').doc(licenseKey);
    const doc = await docRef.get();

    if (!doc.exists) return res.json({ success: false, message: "Key Not Found" });

    const data = doc.data();
    if (data.status !== 'active') return res.json({ success: false, message: "Key " + data.status });

    // Aktivasi HWID
    if (!data.hwid) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + data.durationDays);
      await docRef.update({ hwid, activatedAt: new Date(), expiresAt });
      return res.json({ success: true, message: "Activated", expiresAt });
    }

    // Cek HWID & Expiry
    if (data.hwid !== hwid) return res.json({ success: false, message: "HWID Mismatch" });
    if (data.expiresAt.toDate() < new Date()) return res.json({ success: false, message: "Expired" });

    res.json({ success: true, message: "Valid", expiresAt: data.expiresAt.toDate() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}
