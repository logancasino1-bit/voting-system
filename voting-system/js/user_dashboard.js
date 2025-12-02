import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs, increment, writeBatch, addDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { auth, db, storage } from "./firebase-config.js"; 

let userSelections = {};
let candidatesCache = [];
let orgsData = {}; // Cache for Org Details
let candidatesByOrgMap = {};
let currentUser = null;

// --- AUTH LISTENER ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('currentDateDisplay').textContent = new Date().toDateString();
        await loadProfile(user.uid);
        loadCandidatesForVoting();
        loadOrganizationsPro();
        renderCalendar();
    } else {
        window.location.href = "index.html";
    }
});

// --- NAVIGATION ---
const views = { 
    dash: document.getElementById('view-dashboard'), 
    orgs: document.getElementById('view-orgs'), 
    vote: document.getElementById('view-vote'), 
    guidelines: document.getElementById('view-guidelines'), 
    settings: document.getElementById('view-settings') 
};
const navs = { 
    dash: document.getElementById('nav-dashboard'), 
    orgs: document.getElementById('nav-orgs'), 
    vote: document.getElementById('nav-vote'), 
    guidelines: document.getElementById('nav-guidelines'), 
    settings: document.getElementById('menu-settings') 
};

function switchView(name) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    Object.values(navs).forEach(n => { if(n) n.classList.remove('active'); });
    views[name].classList.remove('hidden');
    if(navs[name] && name !== 'settings') navs[name].classList.add('active');
    document.getElementById('pageTitle').textContent = name === 'dash' ? 'Dashboard' : (name === 'orgs' ? 'Organizations' : (name === 'vote' ? 'Official Ballot' : (name === 'guidelines' ? 'Guidelines' : 'Settings')));
}

Object.keys(navs).forEach(key => {
    if(navs[key]) navs[key].addEventListener('click', (e) => { e.preventDefault(); switchView(key); });
});
document.getElementById('btnGoToVote').addEventListener('click', () => switchView('vote'));
document.getElementById('menu-settings-link').addEventListener('click', () => switchView('settings'));

// --- LOAD ORGANIZATIONS PRO ---
async function loadOrganizationsPro() {
    const container = document.getElementById('orgsProContainer');
    try {
        const [orgSnap, candSnap] = await Promise.all([
            getDocs(collection(db, "organizations")),
            getDocs(collection(db, "candidates"))
        ]);

        if (orgSnap.empty) {
            container.innerHTML = `<p>No organizations found. (Ask Admin to seed data)</p>`;
            return;
        }

        candidatesByOrgMap = {};
        candSnap.forEach(doc => {
            const c = doc.data();
            const orgName = c.organization || "Independent";
            if(!candidatesByOrgMap[orgName]) candidatesByOrgMap[orgName] = [];
            candidatesByOrgMap[orgName].push({ name: c.name, position: c.position, photoUrl: c.photoUrl });
        });

        let html = '';
        orgsData = {}; 
        orgSnap.forEach(doc => {
            const org = doc.data();
            orgsData[org.name] = org;
            const banner = org.bannerUrl || 'https://via.placeholder.com/400x150?text=Banner';

            html += `
            <div class="org-card-pro">
                <img src="${banner}" class="org-banner-thumb">
                <div class="org-card-body">
                    <h3>${org.name}</h3>
                    <span class="org-slogan">${org.slogan}</span>
                    <button class="btn-view-details" onclick="window.openOrgDetails('${org.name}')">View Details</button>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    } catch (e) { console.error(e); }
}

// Modal Logic for Org Details
const orgDetailsModal = document.getElementById('orgDetailsModal');
const closeOrgDetailsBtn = document.getElementById('closeOrgDetails');
const btnApplyToOrgModal = document.getElementById('btnApplyToOrgModal');

window.openOrgDetails = (orgName) => {
    const org = orgsData[orgName];
    const candidates = candidatesByOrgMap[orgName] || [];
    if (!org) return;

    document.getElementById('detailOrgBanner').src = org.bannerUrl || 'https://via.placeholder.com/800x200';
    document.getElementById('detailOrgName').textContent = org.name;
    document.getElementById('detailOrgSlogan').textContent = org.slogan;
    document.getElementById('detailOrgMission').textContent = org.mission;
    document.getElementById('detailOrgGoal').textContent = org.goal;

    const grid = document.getElementById('detailCandidatesGrid');
    if (candidates.length === 0) {
        grid.innerHTML = "<p style='color:#888; grid-column:1/-1;'>No official candidates yet.</p>";
    } else {
        let candHtml = '';
        candidates.forEach(c => {
            candHtml += `
            <div class="mini-cand-card">
                <img src="${c.photoUrl || 'https://img.freepik.com/free-icon/user_318-159711.jpg'}">
                <div class="mini-cand-info"><h5>${c.name}</h5><p>${c.position}</p></div>
            </div>`;
        });
        grid.innerHTML = candHtml;
    }

    btnApplyToOrgModal.onclick = () => {
        orgDetailsModal.classList.remove('show');
        window.openAppModal(orgName);
    };
    orgDetailsModal.classList.add('show');
};
closeOrgDetailsBtn.addEventListener('click', () => orgDetailsModal.classList.remove('show'));

// --- VOTING ---
async function loadCandidatesForVoting() {
    const snap = await getDocs(collection(db, "candidates"));
    candidatesCache = [];
    snap.forEach(d => candidatesCache.push({id: d.id, ...d.data()}));
    
    if (candidatesCache.length === 0) {
        document.getElementById('candidatesContainer').innerHTML = "<p style='text-align:center;'>No candidates found.</p>";
        return;
    }

    let html = '';
    ['President', 'Vice President', 'Secretary'].forEach(pos => {
        const cands = candidatesCache.filter(c => c.position === pos);
        if(cands.length > 0) {
            html += `<div class="position-section"><h3>${pos}</h3><div class="candidates-row">`;
            cands.forEach(c => {
                const name = c.name || c.fullname || "Unknown";
                const org = c.organization || "Independent";
                const img = c.photoUrl || 'https://img.freepik.com/free-icon/user_318-159711.jpg';
                html += `
                <div class="vote-card" id="card-${c.id}">
                    <img src="${img}" alt="${name}">
                    <h4>${name}</h4><p>${org}</p>
                    <button class="btn-vote" onclick="window.selectCandidate('${c.id}', '${pos}')">Select</button>
                </div>`;
            });
            html += `</div></div>`;
        }
    });
    document.getElementById('candidatesContainer').innerHTML = html;
    initChart(candidatesCache);
}

window.selectCandidate = (id, pos) => {
    candidatesCache.filter(c => c.position === pos).forEach(c => {
        document.getElementById(`card-${c.id}`).classList.remove('selected');
        document.getElementById(`card-${c.id}`).querySelector('.btn-vote').innerText = "Select";
    });
    document.getElementById(`card-${id}`).classList.add('selected');
    document.getElementById(`card-${id}`).querySelector('.btn-vote').innerText = "Selected";
    userSelections[pos] = id;
};

document.getElementById('finalSubmitBtn').addEventListener('click', async () => {
    if(Object.keys(userSelections).length === 0) return alert("Select at least one candidate.");
    if(!confirm("Submit vote? This cannot be undone.")) return;

    const batch = writeBatch(db);
    batch.update(doc(db, "users", auth.currentUser.uid), { hasVoted: true });
    Object.values(userSelections).forEach(id => batch.update(doc(db, "candidates", id), { voteCount: increment(1) }));
    await batch.commit();
    alert("Vote Submitted!");
    lockVoting();
});

function lockVoting() {
    document.getElementById('voteStatusBanner').classList.remove('hidden');
    document.getElementById('finalSubmitBtn').style.display = 'none';
    document.getElementById('candidatesContainer').style.pointerEvents = 'none';
    document.getElementById('candidatesContainer').style.opacity = '0.7';
    document.getElementById('btnGoToVote').innerText = "View Ballot";
}

// --- PROFILE & IMAGE UPLOAD ---
const profileUpload = document.getElementById('profileUpload');
profileUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const sRef = ref(storage, `users/${auth.currentUser.uid}/profile.jpg`);
        alert("Uploading...");
        const snap = await uploadBytes(sRef, file);
        const url = await getDownloadURL(snap.ref);
        await updateDoc(doc(db, "users", auth.currentUser.uid), { photoUrl: url });
        document.getElementById('profileImgLarge').src = url;
        document.getElementById('sidebarAvatarImg').src = url;
        document.getElementById('topAvatar').src = url;
        alert("Success!");
    } catch (e) { console.error(e); alert("Upload failed"); }
});

async function loadProfile(uid) {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
        currentUser = snap.data();
        document.getElementById('sideName').textContent = currentUser.first_name;
        document.getElementById('topName').textContent = currentUser.first_name;
        document.getElementById('welcomeMessage').textContent = `Hello, ${currentUser.first_name}!`;
        document.getElementById('profileNameDisplay').textContent = `${currentUser.first_name} ${currentUser.last_name}`;
        
        const img = currentUser.photoUrl || 'https://img.freepik.com/free-icon/user_318-159711.jpg';
        document.getElementById('sidebarAvatarImg').src = img;
        document.getElementById('topAvatar').src = img;
        document.getElementById('profileImgLarge').src = img;

        document.getElementById('p_firstname').value = currentUser.first_name;
        document.getElementById('p_lastname').value = currentUser.last_name;
        document.getElementById('p_email').value = currentUser.email;
        document.getElementById('p_studentid').value = currentUser.student_id;
        document.getElementById('p_birthday').value = currentUser.birthday || '';
        document.getElementById('p_phone').value = currentUser.phone || '';
        document.getElementById('p_strand').value = currentUser.strand || '';
        document.getElementById('p_address').value = currentUser.address || '';
        document.getElementById('appFullname').value = `${currentUser.first_name} ${currentUser.last_name}`;

        if (currentUser.role === 'admin') document.getElementById('adminLinkBtn').style.display = 'flex';
        if (currentUser.hasVoted) lockVoting();
    }
}

// Edit/Save Profile
const btnEdit = document.getElementById('btnEditProfile');
const btnSave = document.getElementById('btnSaveProfile');
const inputs = document.querySelectorAll('.profile-input:not(#p_studentid)');
btnEdit.addEventListener('click', () => { inputs.forEach(i => i.disabled = false); btnEdit.classList.add('hidden'); btnSave.classList.remove('hidden'); });
btnSave.addEventListener('click', async () => {
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
        first_name: document.getElementById('p_firstname').value,
        last_name: document.getElementById('p_lastname').value,
        birthday: document.getElementById('p_birthday').value,
        phone: document.getElementById('p_phone').value,
        strand: document.getElementById('p_strand').value,
        address: document.getElementById('p_address').value
    });
    alert("Saved!");
    inputs.forEach(i => i.disabled = true);
    btnSave.classList.add('hidden');
    btnEdit.classList.remove('hidden');
});

// App Modal
const appModal = document.getElementById('appModal');
window.openAppModal = (orgName) => { appModal.classList.add('show'); if(orgName) document.getElementById('appParty').value = orgName; };
document.getElementById('btnOpenAppModal').addEventListener('click', () => openAppModal(''));
document.getElementById('closeAppModal').addEventListener('click', () => appModal.classList.remove('show'));
document.getElementById('appForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "applications"), {
        fullname: document.getElementById('appFullname').value, position: document.getElementById('appPosition').value,
        party: document.getElementById('appParty').value, platform: document.getElementById('appPlatform').value,
        uid: auth.currentUser.uid, status: 'pending'
    });
    alert("Application Submitted!");
    appModal.classList.remove('show');
});

// Helpers
function initChart(data) {
    const ctx = document.getElementById('resultsChart').getContext('2d');
    const pres = data.filter(c => c.position === 'President');
    if(window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, { type: 'bar', data: { labels: pres.map(c => c.name), datasets: [{ label: 'Votes', data: pres.map(c => c.voteCount), backgroundColor: '#0099ff' }] } });
}
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    document.getElementById('calMonthYear').textContent = new Date().toLocaleString('default', { month: 'long' });
    for(let i=1; i<=30; i++) grid.innerHTML += `<div class="cal-day">${i}</div>`;
}
const drop = document.getElementById('dropdownMenu');
const logoutModal = document.getElementById('logoutModal');
document.getElementById('userDropdownTrigger').addEventListener('click', () => drop.classList.toggle('hidden'));
function confirmLogout(e) { e.preventDefault(); logoutModal.classList.add('show'); }
document.getElementById('menu-logout').addEventListener('click', confirmLogout);
document.getElementById('logoutBtn').addEventListener('click', confirmLogout);
document.getElementById('cancelLogout').addEventListener('click', () => logoutModal.classList.remove('show'));
document.getElementById('confirmLogout').addEventListener('click', () => signOut(auth).then(() => window.location.href = "index.html"));