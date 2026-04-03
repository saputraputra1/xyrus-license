const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}

export default async function handler(req, res) {
  const { email } = req.query;
  if (!email) return res.status(400).send("Gunakan ?email=alamat@email.com");

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
    return res.send(`Sukses! ${email} sekarang adalah Admin. Silahkan Login ulang di Panel.`);
  } catch (e) {
    return res.status(500).send(e.message);
  }
}
