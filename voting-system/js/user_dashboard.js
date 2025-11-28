import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs, increment, writeBatch } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js"; 

// --- STATE ---
let candidatesCache = [];
let userSelections = {};

// --- AUTH & INIT ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await loadUserProfile(user.uid);
        await loadCandidatesAndResults();
        renderCalendar();
        
        // Header Date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentDateDisplay').textContent = new Date().toLocaleDateString('en-US', options);
    } else {
        window.location.href = "index.html";
    }
});

// --- UI HELPERS ---
const dropdownTrigger = document.getElementById('userDropdownTrigger');
const dropdownMenu = document.getElementById('dropdownMenu');
dropdownTrigger.addEventListener('click', () => {
    dropdownMenu.classList.toggle('hidden');
    dropdownMenu.classList.toggle('show');
});

// --- PROFILE LOGIC ---
async function loadUserProfile(uid) {
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Set Displays
        document.getElementById('sideName').textContent = data.first_name;
        document.getElementById('topName').textContent = data.first_name;
        document.getElementById('welcomeMessage').textContent = `Hello, ${data.first_name}!`;
        document.getElementById('profileNameDisplay').textContent = `${data.first_name} ${data.last_name}`;

        // Set Inputs
        fillInputs(data);

        if (data.hasVoted) lockVotingUI();
    }
}

function fillInputs(data) {
    document.getElementById('p_firstname').value = data.first_name || '';
    document.getElementById('p_lastname').value = data.last_name || '';
    document.getElementById('p_studentid').value = data.student_id || '';
    document.getElementById('p_birthday').value = data.birthday || '';
    document.getElementById('p_phone').value = data.phone || '';
    document.getElementById('p_email').value = data.email || '';
    document.getElementById('p_strand').value = data.strand || '';
    document.getElementById('p_address').value = data.address || '';
}

// Edit/Save Profile
const btnEdit = document.getElementById('btnEditProfile');
const btnSave = document.getElementById('btnSaveProfile');
const inputs = document.querySelectorAll('.profile-input:not(#p_studentid)');

btnEdit.addEventListener('click', () => {
    inputs.forEach(i => i.disabled = false);
    btnEdit.classList.add('hidden');
    btnSave.classList.remove('hidden');
});

btnSave.addEventListener('click', async () => {
    try {
        const uid = auth.currentUser.uid;
        const updates = {
            first_name: document.getElementById('p_firstname').value,
            last_name: document.getElementById('p_lastname').value,
            birthday: document.getElementById('p_birthday').value,
            phone: document.getElementById('p_phone').value,
            strand: document.getElementById('p_strand').value,
            address: document.getElementById('p_address').value
        };
        
        await updateDoc(doc(db, "users", uid), updates);
        alert("Profile Updated!");
        inputs.forEach(i => i.disabled = true);
        btnSave.classList.add('hidden');
        btnEdit.classList.remove('hidden');
        
        // Refresh names
        document.getElementById('sideName').textContent = updates.first_name;
        document.getElementById('topName').textContent = updates.first_name;
        document.getElementById('profileNameDisplay').textContent = `${updates.first_name} ${updates.last_name}`;
        
    } catch(e) { console.error(e); alert("Update failed"); }
});


// --- CANDIDATES & RESULTS ---
async function loadCandidatesAndResults() {
    const container = document.getElementById('candidatesContainer');
    const q = collection(db, "candidates");
    const snapshot = await getDocs(q);
    
    candidatesCache = [];
    snapshot.forEach(doc => candidatesCache.push({ id: doc.id, ...doc.data() }));

    if (candidatesCache.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px; color:#888;">
            <i class="fa-solid fa-folder-open" style="font-size:30px;"></i>
            <p>No candidates found in database.</p>
        </div>`;
        initChart([]);
        return;
    }

    const positions = ["President", "Vice President", "Secretary"];
    let html = '';

    positions.forEach(pos => {
        const cands = candidatesCache.filter(c => c.position === pos);
        if (cands.length > 0) {
            html += `<div class="position-section"><h3>${pos}</h3><div class="candidates-row">`;
            cands.forEach(c => {
                // FALLBACK FOR NAMES
                const name = c.name || c.fullname || "Unknown Name";
                const party = c.party || "Independent";
                const img = c.photoUrl || 'https://img.freepik.com/free-icon/user_318-159711.jpg';
                
                html += `
                <div class="vote-card" id="card-${c.id}">
                    <img src="${img}" alt="${name}">
                    <h4>${name}</h4>
                    <p>${party}</p>
                    <button class="btn-vote" onclick="window.selectCandidate('${c.id}', '${pos}')">Select</button>
                </div>`;
            });
            html += `</div></div>`;
        }
    });

    container.innerHTML = html;
    window.candidatesCache = candidatesCache; // Global ref
    initChart(candidatesCache);
}

// Global Select Function
window.selectCandidate = (candId, position) => {
    const allInPos = window.candidatesCache.filter(c => c.position === position);
    allInPos.forEach(c => {
        const card = document.getElementById(`card-${c.id}`);
        if(card) {
            card.classList.remove('selected');
            card.querySelector('.btn-vote').innerText = "Select";
        }
    });

    const card = document.getElementById(`card-${candId}`);
    card.classList.add('selected');
    card.querySelector('.btn-vote').innerText = "Selected";
    userSelections[position] = candId;
};

// Submit Vote
document.getElementById('finalSubmitBtn').addEventListener('click', async () => {
    if (Object.keys(userSelections).length === 0) return alert("Select at least one candidate.");
    if (confirm("Submit votes? This is final.")) {
        const batch = writeBatch(db);
        batch.update(doc(db, "users", auth.currentUser.uid), { hasVoted: true });
        
        Object.values(userSelections).forEach(id => {
            batch.update(doc(db, "candidates", id), { voteCount: increment(1) });
        });

        try {
            await batch.commit();
            alert("Vote Submitted!");
            lockVotingUI();
            loadCandidatesAndResults(); // Refresh chart
        } catch(e) { console.error(e); alert("Error"); }
    }
});

function lockVotingUI() {
    document.getElementById('voteStatusBanner').classList.remove('hidden');
    document.getElementById('candidatesContainer').style.pointerEvents = "none";
    document.getElementById('candidatesContainer').style.opacity = "0.7";
    document.getElementById('finalSubmitBtn').style.display = 'none';
    const btnVote = document.getElementById('btnGoToVote');
    if(btnVote) btnVote.innerText = "View Ballot";
}

// --- CHART ---
function initChart(candidates) {
    const ctx = document.getElementById('resultsChart').getContext('2d');
    
    let labels = [], data = [];
    if(candidates && candidates.length > 0) {
        const pres = candidates.filter(c => c.position === "President");
        labels = pres.map(c => c.name || c.fullname);
        data = pres.map(c => c.voteCount || 0);
    }

    if (window.myChart instanceof Chart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Votes', data: data,
                backgroundColor: ['#7986cb', '#283593', '#0099ff'],
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: { x: { display: false }, y: { grid: { display: false } } },
            plugins: { legend: { display: false } }
        }
    });
}

// --- CALENDAR ---
function renderCalendar() {
    const date = new Date();
    document.getElementById('calMonthYear').textContent = date.toLocaleString('default', { month: 'long' });
    
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = "";

    for(let i=0; i<firstDay; i++) grid.innerHTML += `<div></div>`;
    for(let i=1; i<=daysInMonth; i++) {
        const isToday = i === date.getDate() ? "today" : "";
        grid.innerHTML += `<div class="cal-day ${isToday}">${i}</div>`;
    }
}

// --- NAVIGATION ---
const views = {
    dashboard: document.getElementById('view-dashboard'),
    vote: document.getElementById('view-vote'),
    guidelines: document.getElementById('view-guidelines'),
    settings: document.getElementById('view-settings')
};
const navs = {
    dashboard: document.getElementById('nav-dashboard'),
    vote: document.getElementById('nav-vote'),
    guidelines: document.getElementById('nav-guidelines'),
    settings: document.getElementById('menu-settings')
};

function switchView(name) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    [navs.dashboard, navs.vote, navs.guidelines].forEach(n => n.classList.remove('active'));
    
    views[name].classList.remove('hidden');
    if(navs[name] && name !== 'settings') navs[name].classList.add('active');
    
    const titles = { dashboard: "Dashboard", vote: "Official Ballot", guidelines: "Guidelines", settings: "Settings" };
    document.getElementById('pageTitle').textContent = titles[name];
}

navs.dashboard.addEventListener('click', (e) => { e.preventDefault(); switchView('dashboard'); });
navs.vote.addEventListener('click', (e) => { e.preventDefault(); switchView('vote'); });
navs.guidelines.addEventListener('click', (e) => { e.preventDefault(); switchView('guidelines'); });
navs.settings.addEventListener('click', (e) => { e.preventDefault(); switchView('settings'); });
const btnVote = document.getElementById('btnGoToVote');
if(btnVote) btnVote.addEventListener('click', () => switchView('vote'));

document.getElementById('menu-logout').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "index.html");
});