import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, writeBatch, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { auth, db, storage } from "./firebase-config.js"; 

let currentEditingOrgId = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('currentDate').textContent = new Date().toDateString();
        loadStats();
        loadOrgs();
        loadCandidatesTable();
    } else {
        window.location.href = "index.html";
    }
});

// --- NAVIGATION ---
const views = { overview: 'view-overview', orgs: 'view-orgs', candidates: 'view-candidates', settings: 'view-settings' };
const navs = { overview: 'nav-overview', orgs: 'nav-orgs', candidates: 'nav-candidates', settings: 'nav-settings' };

window.switchView = (name) => {
    Object.values(views).forEach(id => document.getElementById(id).classList.add('hidden'));
    Object.values(navs).forEach(id => document.getElementById(id).classList.remove('active'));
    document.getElementById(views[name]).classList.remove('hidden');
    document.getElementById(navs[name]).classList.add('active');
    document.getElementById('pageTitle').textContent = name.charAt(0).toUpperCase() + name.slice(1);
};

Object.keys(navs).forEach(key => {
    document.getElementById(navs[key]).addEventListener('click', (e) => { e.preventDefault(); switchView(key); });
});

// --- BANNER UPLOAD ---
const bannerInput = document.getElementById('orgBannerInput');
window.triggerBannerUpload = (id) => { currentEditingOrgId = id; bannerInput.click(); };

bannerInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    try {
        const sRef = ref(storage, `organizations/${currentEditingOrgId}/banner.jpg`);
        alert("Uploading Banner...");
        const snap = await uploadBytes(sRef, file);
        const url = await getDownloadURL(snap.ref);
        await updateDoc(doc(db, "organizations", currentEditingOrgId), { bannerUrl: url });
        alert("Banner Updated!");
        loadOrgs(); // Refresh
    } catch(e) { console.error(e); alert("Upload Failed"); }
});

// --- LOADERS ---
async function loadOrgs() {
    const container = document.getElementById('orgsContainer');
    const snap = await getDocs(collection(db, "organizations"));
    let html = '';
    snap.forEach(d => {
        const org = d.data();
        html += `
        <div class="org-card-pro" style="margin-bottom:20px;">
            <div style="position:relative; height:120px;">
                <img src="${org.bannerUrl || 'https://via.placeholder.com/400x120'}" style="width:100%; height:100%; object-fit:cover;">
                <button onclick="window.triggerBannerUpload('${d.id}')" style="position:absolute; bottom:10px; right:10px; padding:5px; cursor:pointer;">Change Banner</button>
            </div>
            <div style="padding:15px;">
                <h3 style="margin:0;">${org.name}</h3>
                <p style="color:#888; font-size:13px;">${org.slogan}</p>
            </div>
        </div>`;
    });
    container.innerHTML = html || "<p>No organizations found. Go to Settings > Reset DB.</p>";
}

async function loadCandidatesTable() {
    const snap = await getDocs(collection(db, "candidates"));
    const tbody = document.getElementById('candidatesTableBody');
    tbody.innerHTML = '';
    snap.forEach(doc => {
        const c = doc.data();
        tbody.innerHTML += `<tr><td>${c.name}</td><td>${c.position}</td><td>${c.organization}</td><td>${c.voteCount}</td><td><button onclick="window.delCand('${doc.id}')" style="color:red; border:none; background:none; cursor:pointer;">Del</button></td></tr>`;
    });
}

window.delCand = async (id) => {
    if(confirm("Delete?")) { await deleteDoc(doc(db, "candidates", id)); loadCandidatesTable(); }
};

async function loadStats() {
    const candSnap = await getDocs(collection(db, "candidates"));
    document.getElementById('statCandidates').textContent = candSnap.size;
    
    // Simple Chart
    const labels = [];
    const data = [];
    candSnap.forEach(d => { labels.push(d.data().name); data.push(d.data().voteCount); });
    
    new Chart(document.getElementById('adminResultsChart'), {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'Votes', data: data, backgroundColor: '#0099ff' }] }
    });
}

// --- SEEDER ---
document.getElementById('btnSeedDatabase').addEventListener('click', async () => {
    if(!confirm("Reset DB? This deletes all data.")) return;
    const batch = writeBatch(db);
    
    // Clear old
    const cSnap = await getDocs(collection(db, "candidates"));
    cSnap.forEach(d => batch.delete(d.ref));
    const oSnap = await getDocs(collection(db, "organizations"));
    oSnap.forEach(d => batch.delete(d.ref));

    // Add Orgs
    const orgs = [
        { name: "Innovators", slogan: "Future Ready", mission: "To Innovate.", goal: "Digital Campus.", bannerUrl: "" },
        { name: "Visionaries", slogan: "Voice of Students", mission: "To Serve.", goal: "Better Facilities.", bannerUrl: "" }
    ];
    orgs.forEach(o => batch.set(doc(collection(db, "organizations")), o));

    // Add Candidates
    const cands = [
        { name: "Roderick Pastor", position: "President", organization: "Innovators", voteCount: 0, photoUrl: "https://img.freepik.com/free-photo/portrait-african-american-man_23-2149072179.jpg" },
        { name: "Pierce Belloso", position: "President", organization: "Visionaries", voteCount: 0, photoUrl: "https://img.freepik.com/free-photo/young-bearded-man-with-striped-shirt_273609-5677.jpg" }
    ];
    cands.forEach(c => batch.set(doc(collection(db, "candidates")), c));

    await batch.commit();
    alert("Database Reset!");
    location.reload();
});

document.getElementById('adminLogoutBtn').addEventListener('click', () => signOut(auth).then(() => window.location.href = "index.html"));