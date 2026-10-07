// --- CENTRAL DATA MATRIX INITIALIZATION ---
let state = {
    tasks: [],
    xp: 0,
    dailyGoalCount: 5,
    activeTab: 'dashboard',
    timeFilter: 'all',
    boardFilter: 'all',
    searchQuery: ''
};

const domainColors = {
    Mathematics: '#3b82f6', 
    Coding: '#38bdf8', 
    Art: '#a855f7',
    Philosophy: '#8b5cf6', 
    Fitness: '#10b981', 
    Science: '#ec4899',
    Logic: '#64748b', 
    Literature: '#f43f5e', 
    Language: '#14b8a6',
    Music: '#818cf8', 
    Business: '#eab308', 
    Mindfulness: '#2dd4bf',
    Hobbies: '#f97316', 
    Study: '#f59e0b'
};

const DOMAIN_KEYWORDS = {
    Mathematics: ["math","algebra","geometry","calculus","equation","trigonometry","statistics","probability","theorem","integral","derivative","linear","matrix"],
    Coding: ["code","coding","program","javascript","typescript","python","react","java","rust","golang","algorithm","leetcode","debug","api","backend","frontend","sql","html","css","git","build","ship","app","website","function"],
    Art: ["draw","paint","sketch","art","design","illustration","color","canvas","figma","photoshop","ui","ux","logo"],
    Philosophy: ["philosophy","stoic","ethics","meaning","existential","kant","nietzsche","plato","aristotle","metaphysics","consciousness"],
    Fitness: ["gym","run","running","workout","exercise","yoga","stretch","push-up","pushup","pullup","squat","lift","weight","cardio","walk","swim","cycle","fitness","training"],
    Science: ["science","physics","chemistry","biology","experiment","research","neuroscience","astronomy","quantum","evolution","anatomy"],
    Logic: ["logic","puzzle","chess","reasoning","argument","fallacy","proof","deduction","syllogism","riddle"],
    Literature: ["read","book","novel","poem","poetry","essay","write","writing","literature","chapter","story","shakespeare"],
    Language: ["spanish","french","german","japanese","chinese","korean","italian","arabic","language","vocabulary","grammar","duolingo","translate"],
    Music: ["music","guitar","piano","violin","drum","sing","song","compose","chord","scale","instrument","practice"],
    Business: ["business","startup","marketing","sales","client","customer","revenue","pitch","meeting","email","strategy","finance","invest","stock"],
    Mindfulness: ["meditate","meditation","mindful","breathe","breathing","journal","gratitude","reflect","calm"],
    Hobbies: ["hobby","collect","garden","cook","baking","knit","photography","photo","photos","fishing","hiking","diy","craft","fight"],
    Study: [ "study", "homework", "exam", "quiz", "test", "review",  "assignment", "lecture", "notes", "textbook", "university",  "school", "college", "semester", "revision", "flashcards", "course", "curriculum", "scholar", "thesis", "essay"]
};

// --- RANKS ---
const RANKS = [
    { name: 'Novice', minXp: 0 },
    { name: 'Apprentice', minXp: 200 },
    { name: 'Scholar', minXp: 600 },
    { name: 'Sage', minXp: 1400 },
    { name: 'Polymath', minXp: 3000 },
    { name: 'Grandmaster', minXp: 6000 }
];

let progressionChartInstance = null;
let pieChartInstance = null;

// --- INITIALIZATION GATEWAY ---
document.addEventListener('DOMContentLoaded', () => {
    loadStateFromStorage();
    setupNavigation();
    setupFiltersAndForms();
    initializeVisuals();
    renderAll();
});

function loadStateFromStorage() {
    const saved = localStorage.getItem('polymath_os_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state.tasks = parsed.tasks || [];
            state.xp = parsed.xp || 0;
        } catch (e) { console.error("Data storage reset.", e); }
    }
}

function saveStateToStorage() {
    localStorage.setItem('polymath_os_state', JSON.stringify({
        tasks: state.tasks, xp: state.xp
    }));
}

function calculateRank(xp) {
    let current = RANKS[0];
    let next = null;
    for (let i = 0; i < RANKS.length; i++) {
        if (xp >= RANKS[i].minXp) {
            current = { ...RANKS[i], level: i };
            next = RANKS[i+1] || null;
        } else { break; }
    }
    return { name: current.name, level: current.level, next: next };
}

// --- RENDERING CORE CONTROL ---
function renderAll() {
    updateStatsDashboard();
    renderDomainProgressAndInsights();
    renderTaskList();
    renderAchievements();
    updateCharts();
    renderHeatmap();
}

function updateStatsDashboard() {
    document.getElementById('stat-xp').innerText = state.xp.toLocaleString();
    
    const rankData = calculateRank(state.xp);
    document.getElementById('stat-rank').innerText = rankData.name;
    if (rankData.next) {
        document.getElementById('stat-next-rank').innerText = `${rankData.next.minXp - state.xp} XP remaining for ${rankData.next.name}`;
    } else {
        document.getElementById('stat-next-rank').innerText = 'Maximum Ascension Level Achieved';
    }

    const uniqueCompletedDomains = new Set(state.tasks.filter(t => t.completed).map(t => t.domain));
    const allUniqueDomains = new Set(state.tasks.map(t => t.domain));
    document.getElementById('stat-domains').innerText = `${uniqueCompletedDomains.size} / ${Math.max(allUniqueDomains.size, 1)}`;
    
    document.getElementById('stat-achievements').innerText = state.tasks.filter(t => t.completed).length;

    const domainCounts = {};
    state.tasks.filter(t => t.completed).forEach(t => { domainCounts[t.domain] = (domainCounts[t.domain] || 0) + 1; });
    const domainArray = Object.entries(domainCounts);
    
    if (domainArray.length > 0) {
        domainArray.sort((a, b) => b[1] - a[1]);
        document.getElementById('stat-most-active').innerText = domainArray[0][0];
        document.getElementById('stat-least-active').innerText = domainArray[domainArray.length - 1][0];
    } else {
        document.getElementById('stat-most-active').innerText = '-';
        document.getElementById('stat-least-active').innerText = '-';
    }

    const distinctDays = new Set(state.tasks.filter(t => t.completed && t.completedDate).map(t => t.completedDate.split('T')[0]));
    const totalDays = Math.max(distinctDays.size, 1);
    const totalCompleted = state.tasks.filter(t => t.completed).length;
    document.getElementById('stat-avg-tasks').innerText = (totalCompleted / totalDays).toFixed(1);

    const todayStr = new Date().toISOString().split('T')[0];
    const finishedToday = state.tasks.filter(t => t.completed && t.completedDate && t.completedDate.startsWith(todayStr)).length;
    document.getElementById('goal-fraction').innerText = `${finishedToday}/${state.dailyGoalCount}`;
    
    const pct = Math.min((finishedToday / state.dailyGoalCount), 1);
    const offset = 377 - (377 * pct);
    document.getElementById('goal-progress-bar').style.strokeDashoffset = offset;
    
    const goalStatus = document.getElementById('goal-status');
    if (finishedToday >= state.dailyGoalCount) {
        goalStatus.innerText = "🎉 Objective Matrix Achieved!";
        goalStatus.style.color = "var(--success)";
    } else {
        goalStatus.innerText = "Keep pushing forward!";
        goalStatus.style.color = "var(--accent-secondary)";
    }
}

function renderDomainProgressAndInsights() {
    const container = document.getElementById('domain-progress-bars');
    const insightsContainer = document.getElementById('smart-insights');
    container.innerHTML = '';
    insightsContainer.innerHTML = '';

    const completedTasks = state.tasks.filter(t => t.completed);
    const total = completedTasks.length;
    const domainCounts = {};
    completedTasks.forEach(t => { domainCounts[t.domain] = (domainCounts[t.domain] || 0) + 1; });

    Object.keys(domainColors).forEach(domain => {
        const count = domainCounts[domain] || 0;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        
        if(count > 0 || state.tasks.some(t => t.domain === domain)) {
            const row = document.createElement('div');
            row.className = 'domain-progress-row';
            row.innerHTML = `
                <span class="domain-label">${domain}</span>
                <div class="progress-track-bar">
                    <div class="progress-fill-bar" style="width: ${percentage}%; background: ${domainColors[domain]}"></div>
                </div>
                <span class="domain-pct">${percentage}%</span>
            `;
            container.appendChild(row);
        }
    });

    let insights = [];
    const domainArray = Object.entries(domainCounts).sort((a,b) => b[1] - a[1]);
    
    if (total > 0 && domainArray.length > 0) {
        const topDomain = domainArray[0][0];
        const topPct = Math.round((domainArray[0][1] / total) * 100);
        insights.push(`<div class="insight-card">You've dedicated <strong>${topPct}%</strong> of completions to the <strong>${topDomain}</strong> domain matrix.</div>`);
        
        let dormantFound = false;
        Object.keys(domainColors).forEach(d => {
            if(!domainCounts[d] && state.tasks.some(t => t.domain === d)) {
                insights.push(`<div class="insight-card warning">The <strong>${d}</strong> field is currently dormant. Initiate an objective variant here today.</div>`);
                dormantFound = true;
            }
        });

        if(!dormantFound && domainArray.length > 1) {
            const lowDomain = domainArray[domainArray.length - 1][0];
            insights.push(`<div class="insight-card warning">Your focus is lowest in <strong>${lowDomain}</strong>. Consider micro-dosing information execution there.</div>`);
        }
    } else {
        insights.push(`<div class="insight-card">Operational matrix clear. Create and execute tasks to compile performance telemetry.</div>`);
    }
    
    insightsContainer.innerHTML = insights.join('');
}

function renderTaskList() {
    const container = document.getElementById('task-list');
    container.innerHTML = '';

    let filtered = state.tasks.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
                              t.domain.toLowerCase().includes(state.searchQuery.toLowerCase());
        const matchesBoard = state.boardFilter === 'all' || 
                             (state.boardFilter === 'completed' && t.completed) || 
                             (state.boardFilter === 'pending' && !t.completed);
        return matchesSearch && matchesBoard;
    });

    if(filtered.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">No matching task matrices detected.</p>`;
        return;
    }

    filtered.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card-item ${task.completed ? 'completed' : 'pending'}`;
        
        const createdForm = new Date(task.createdDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
        const compForm = task.completedDate ? new Date(task.completedDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : '-';
        
        card.innerHTML = `
            <div class="task-card-top">
                <div class="checkbox-custom" onclick="toggleTaskCompletion('${task.id}')">
                    ${task.completed ? '<i class="fa-solid fa-check"></i>' : ''}
                </div>
                <h4>${task.title}</h4>
            </div>
            <div class="task-metadata-list">
                <div class="meta-lbl">Created: <span>${createdForm}</span></div>
                <div class="meta-lbl">Completed: <span>${compForm}</span></div>
                <div class="meta-lbl">Difficulty: <span>${task.difficulty}</span></div>
            </div>
            <div class="task-card-action-row">
                <span class="domain-tag" style="background: rgba(${hexToRgb(domainColors[task.domain] || '#ffffff')}, 0.15); color: ${domainColors[task.domain]}">${task.domain}</span>
                <span class="xp-badge">+${task.xpValue} XP</span>
                <button class="delete-task-btn" onclick="deleteTask('${task.id}')"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderAchievements() {
    const container = document.getElementById('achievements-grid');
    container.innerHTML = '';

    const completedTasks = state.tasks.filter(t => t.completed);

    if (completedTasks.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">Complete your first matrix objective to earn an achievement.</p>`;
        return;
    }

    completedTasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'achievement-badge-card unlocked'; 
        
        let icon = '⭐';
        if (task.domain === 'Coding' || task.domain === 'Logic') icon = '💻';
        if (task.domain === 'Fitness') icon = '🏋';
        if (task.domain === 'Study' || task.domain === 'Mathematics') icon = '📚';
        if (task.domain === 'Music' || task.domain === 'Art') icon = '🎨';
        
        card.innerHTML = `
            <div class="badge-art-icon">${icon}</div>
            <div class="badge-details">
                <h4>${task.title}</h4>
                <p>${task.domain} Mastery (+${task.xpValue} XP)</p>
            </div>
        `;
        container.appendChild(card);
    });
}

window.toggleTaskCompletion = function(id) {
    const task = state.tasks.find(t => t.id === id);
    if(task) {
        task.completed = !task.completed;
        if(task.completed) {
            task.completedDate = new Date().toISOString();
            state.xp += task.xpValue;
        } else {
            task.completedDate = null;
            state.xp = Math.max(0, state.xp - task.xpValue);
        }
        saveStateToStorage();
        renderAll();
    }
};

window.deleteTask = function(id) {
    const index = state.tasks.findIndex(t => t.id === id);
    if(index !== -1) {
        const task = state.tasks[index];
        if(task.completed) {
            state.xp = Math.max(0, state.xp - task.xpValue);
        }
        state.tasks.splice(index, 1);
        saveStateToStorage();
        renderAll();
    }
};

function initializeVisuals() {
    const ctxProgress = document.getElementById('xpProgressionChart').getContext('2d');
    progressionChartInstance = new Chart(ctxProgress, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'XP Accumulation', data: [], borderColor: '#38bdf8', tension: 0.3, fill: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#334155' } }, x: { grid: { display: false } } } }
    });

    const ctxPie = document.getElementById('domainPieChart').getContext('2d');
    pieChartInstance = new Chart(ctxPie, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function updateCharts() {
    if(!progressionChartInstance || !pieChartInstance) return;

    let labels = [];
    let xpData = [];
    let rollingXp = 0;

    const completedTasksSorted = state.tasks
        .filter(t => t.completed && t.completedDate)
        .sort((a,b) => new Date(a.completedDate) - new Date(b.completedDate));

    const now = new Date();
    let cutoff = new Date(0); 

    if(state.timeFilter === 'today') cutoff = new Date(now.setHours(0,0,0,0));
    else if(state.timeFilter === 'week') cutoff = new Date(now.setDate(now.getDate() - 7));
    else if(state.timeFilter === 'month') cutoff = new Date(now.setMonth(now.getMonth() - 1));
    else if(state.timeFilter === 'year') cutoff = new Date(now.setFullYear(now.getFullYear() - 1));

    completedTasksSorted.forEach(t => {
        const d = new Date(t.completedDate);
        rollingXp += t.xpValue;
        if(d >= cutoff) {
            labels.push(d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}));
            xpData.push(rollingXp);
        }
    });

    progressionChartInstance.data.labels = labels;
    progressionChartInstance.data.datasets[0].data = xpData;
    progressionChartInstance.update();

    const completedTasks = state.tasks.filter(t => t.completed);
    const domainCounts = {};
    completedTasks.forEach(t => { domainCounts[t.domain] = (domainCounts[t.domain] || 0) + 1; });

    const total = completedTasks.length;
    const pieLabels = [];
    const pieData = [];
    const pieColors = [];
    const legendContainer = document.getElementById('pie-legend-custom');
    legendContainer.innerHTML = '';

    Object.entries(domainCounts).forEach(([domain, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        pieLabels.push(domain);
        pieData.push(count);
        pieColors.push(domainColors[domain] || '#ffffff');

        const leg = document.createElement('div');
        leg.className = 'pie-legend-item';
        leg.innerHTML = `
            <span class="legend-color-dot" style="background: ${domainColors[domain]}"></span>
            <span>${domain} <strong>(${pct}%)</strong></span>
        `;
        legendContainer.appendChild(leg);
    });

    pieChartInstance.data.labels = pieLabels;
    pieChartInstance.data.datasets[0].data = pieData;
    pieChartInstance.data.datasets[0].backgroundColor = pieColors;
    pieChartInstance.update();
}

function renderHeatmap() {
    const container = document.getElementById('calendar-heatmap');
    container.innerHTML = '';

    const today = new Date();
    const mapDays = 364; 
    
    const xpPerDay = {};
    state.tasks.filter(t => t.completed && t.completedDate).forEach(t => {
        const dateKey = t.completedDate.split('T')[0];
        xpPerDay[dateKey] = (xpPerDay[dateKey] || 0) + t.xpValue;
    });

    for(let i = mapDays; i >= 0; i--) {
        const currentLoopDate = new Date();
        currentLoopDate.setDate(today.getDate() - i);
        const dateString = currentLoopDate.toISOString().split('T')[0];
        const dayXp = xpPerDay[dateString] || 0;

        let level = 0;
        if(dayXp > 0 && dayXp <= 10) level = 1;
        else if(dayXp > 10 && dayXp <= 20) level = 2;
        else if(dayXp > 20 && dayXp <= 40) level = 3;
        else if(dayXp > 40) level = 4;

        const square = document.createElement('div');
        square.className = `heatmap-day level-${level}`;
        square.setAttribute('data-tooltip', `${currentLoopDate.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})} : ${dayXp} XP`);
        container.appendChild(square);
    }
}

// --- SETUP FORM ELEMENT CONTROL NODES ---
function setupFiltersAndForms() {
    
    // Auto-Categorization Engine (Upgraded to detect partial matches)
    const titleInput = document.getElementById('task-title');
    const domainSelect = document.getElementById('task-domain');
    
    titleInput.addEventListener('input', (e) => {
        const text = e.target.value.toLowerCase();
        
        for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
            const hasMatch = keywords.some(kw => text.includes(kw));
            if (hasMatch) {
                domainSelect.value = domain;
                break; 
            }
        }
    });

    // Task Form Submit Logic
    document.getElementById('task-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('task-title').value;
        const domain = document.getElementById('task-domain').value;
        const difficulty = document.getElementById('task-difficulty').value;

        let xpVal = 20;
        if(difficulty === 'Easy') xpVal = 10;
        else if(difficulty === 'Hard') xpVal = 40;

        const newTask = {
            id: 'task_' + Date.now(), title, domain, difficulty, xpValue: xpVal,
            completed: false, createdDate: new Date().toISOString(), completedDate: null
        };

        state.tasks.push(newTask);
        saveStateToStorage();
        renderAll();
        
        document.getElementById('task-form').reset();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.timeFilter = e.target.getAttribute('data-filter');
            updateCharts();
        });
    });

    document.querySelectorAll('.board-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.board-filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.boardFilter = e.target.getAttribute('data-board-filter');
            renderTaskList();
        });
    });

    document.getElementById('global-search').addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderTaskList();
    });
}

function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const buttonClicked = e.target.closest('.nav-btn');
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            buttonClicked.classList.add('active');
            
            const targetTab = buttonClicked.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            document.getElementById(targetTab).classList.add('active');
            
            if(targetTab === 'dashboard') {
                setTimeout(() => { updateCharts(); renderHeatmap(); }, 50);
            }
        });
    });
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
}