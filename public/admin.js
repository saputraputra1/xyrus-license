// ISI DENGAN SDK CONFIG DARI FIREBASE CONSOLE (WEB APP)
const firebaseConfig = {
  apiKey: "AIzaSyD2JVqc7cq4e-NgTqz1bQ3qEyolUsXKOzs",
  authDomain: "xyruss.firebaseapp.com",
  projectId: "xyruss",
  storageBucket: "xyruss.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Login
window.login = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    auth.signInWithEmailAndPassword(email, pass).catch(e => alert(e.message));
}

// Observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const idToken = await user.getIdTokenResult();
        const role = idToken.claims.role || 'reseller';

        document.getElementById('auth-gate').classList.add('hidden');
        document.getElementById('panel').classList.remove('hidden');
        document.getElementById('user-display').innerText = `${user.email} // ROLE: ${role.toUpperCase()}`;
        document.getElementById('role-title').innerText = `${role} Command Center`;

        if (role === 'admin') {
            db.collection('licenses').onSnapshot(renderTable);
        } else {
            db.collection('licenses').where('resellerId', '==', user.uid).onSnapshot(renderTable);
        }
    } else {
        document.getElementById('auth-gate').classList.remove('hidden');
        document.getElementById('panel').classList.add('hidden');
    }
});

// Create Key
window.generateKey = async () => {
    const days = parseInt(document.getElementById('days').value);
    const note = document.getElementById('note').value || "-";
    if (!days) return alert("Durasi tidak valid");

    const key = "XYRUS-" + Math.random().toString(36).toUpperCase().substring(2, 12);
    await db.collection('licenses').doc(key).set({
        licenseKey: key,
        resellerId: auth.currentUser.uid,
        resellerEmail: auth.currentUser.email,
        status: 'active',
        durationDays: days,
        note: note,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        hwid: null,
        expiresAt: null
    });
}

function renderTable(snap) {
    const tbody = document.getElementById('license-table');
    tbody.innerHTML = '';
    snap.forEach(doc => {
        const l = doc.data();
        const expiry = l.expiresAt ? l.expiresAt.toDate().toLocaleDateString() : 'BELUM AKTIF';
        const row = `
            <tr class="border-b border-slate-800/50 hover:bg-slate-900/30 transition">
                <td class="p-6 font-mono text-red-500 font-bold select-all">${l.licenseKey}</td>
                <td class="p-6">
                    <span class="px-3 py-1 rounded-full text-[10px] font-black ${l.status === 'active' ? 'bg-green-900/30 text-green-500' : 'bg-red-900/30 text-red-500'}">
                        ${l.status.toUpperCase()}
                    </span>
                </td>
                <td class="p-6 text-slate-400 font-mono text-xs">${expiry}</td>
                <td class="p-6 text-[10px] font-mono text-slate-600 truncate max-w-[150px]">${l.hwid || '---'}</td>
                <td class="p-6 text-slate-400 italic text-xs">${l.note}</td>
                <td class="p-6 text-right space-x-2">
                    <button onclick="toggleKey('${l.licenseKey}', '${l.status}')" class="text-blue-500 text-xs hover:underline font-bold">SUSPEND</button>
                    <button onclick="resetKey('${l.licenseKey}')" class="text-orange-600 text-xs hover:underline font-bold">RESET HWID</button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

window.toggleKey = async (key, status) => {
    const next = status === 'active' ? 'suspended' : 'active';
    await db.collection('licenses').doc(key).update({ status: next });
}

window.resetKey = async (key) => {
    if(confirm("Reset HWID untuk key ini?")) {
        await db.collection('licenses').doc(key).update({ hwid: null });
    }
}
