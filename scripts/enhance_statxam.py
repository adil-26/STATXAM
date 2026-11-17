import re

print("Starting enhancement of StatXam files...")

# ==========================================
# 1. ENHANCE HOME.HTML & INDEX.HTML
# ==========================================
with open('home.html', 'r', encoding='utf-8') as f:
    home = f.read()

# Add interactive click to Domain Modules
modules_replacements = [
    ('<!-- Physics Module -->\n<div class="w-full bg-surface-container rounded-xl',
     '<!-- Physics Module -->\n<div onclick="window.location.href=\'practice.html?subject=physics\'" class="w-full bg-surface-container rounded-xl cursor-pointer active:scale-[0.99] transition-transform'),
    ('<!-- Chemistry Module -->\n<div class="w-full bg-surface-container rounded-xl',
     '<!-- Chemistry Module -->\n<div onclick="window.location.href=\'practice.html?subject=chemistry\'" class="w-full bg-surface-container rounded-xl cursor-pointer active:scale-[0.99] transition-transform'),
    ('<!-- Mathematics Module -->\n<div class="w-full bg-surface-container rounded-xl',
     '<!-- Mathematics Module -->\n<div onclick="window.location.href=\'practice.html?subject=mathematics\'" class="w-full bg-surface-container rounded-xl cursor-pointer active:scale-[0.99] transition-transform'),
    ('<!-- Biology Module -->\n<div class="w-full bg-surface-container rounded-xl',
     '<!-- Biology Module -->\n<div onclick="window.location.href=\'practice.html?subject=biology\'" class="w-full bg-surface-container rounded-xl cursor-pointer active:scale-[0.99] transition-transform')
]
for old, new in modules_replacements:
    home = home.replace(old, new)

# Connect Resume Test Arena button
home = home.replace(
    '<button class="w-full py-3 px-space-md rounded-lg bg-primary-container text-on-primary font-headline-md text-[16px] font-bold flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(0,240,255,0.45)] hover:shadow-[0_0_32px_rgba(0,240,255,0.6)] active:scale-[0.98] transition-all">',
    '<button id="resumeTestBtn" class="w-full py-3 px-space-md rounded-lg bg-primary-container text-on-primary font-headline-md text-[16px] font-bold flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(0,240,255,0.45)] hover:shadow-[0_0_32px_rgba(0,240,255,0.6)] active:scale-[0.98] transition-all cursor-pointer">'
)

# Add Test Arena Modal to Home and script for launching it
test_arena_modal = """
<!-- Interactive Test Arena Simulation Modal -->
<div id="testArenaModal" class="hidden fixed inset-0 z-50 bg-surface/95 backdrop-blur-xl flex flex-col justify-between p-margin pb-safe animate-fade-in">
  <div class="flex items-center justify-between py-space-sm border-b border-surface-container-high">
    <div class="flex items-center gap-2">
      <span class="w-2.5 h-2.5 rounded-full bg-primary-container animate-ping"></span>
      <span class="font-headline-md text-[16px] text-on-surface font-semibold">JEE Advanced 2024 Paper 1</span>
    </div>
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high font-mono text-primary font-bold text-sm">
        <span class="material-symbols-outlined text-[16px] text-primary-container">timer</span>
        <span id="testTimer">13:58</span>
      </div>
      <button onclick="closeTestArena()" class="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center active:scale-90 transition-transform">
        <span class="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  </div>

  <div class="flex-1 overflow-y-auto py-space-md flex flex-col gap-space-md">
    <div class="flex items-center justify-between">
      <span class="px-2 py-0.5 rounded bg-surface-container-high text-primary-container font-label-sm uppercase font-semibold">Question 17 of 25</span>
      <span class="font-label-sm text-tertiary uppercase">+4 / -1 Marking</span>
    </div>
    <div class="p-space-md rounded-xl bg-surface-container-low shadow-sm flex flex-col gap-2">
      <p class="font-body-md text-on-surface leading-relaxed">
        Let vector <strong class="text-primary font-mono">u = 2i - j + k</strong> and <strong class="text-primary font-mono">v = i + 2j - k</strong>. If vector <strong class="text-primary-container font-mono">w</strong> is coplanar with <strong class="text-primary font-mono">u</strong> and <strong class="text-primary font-mono">v</strong>, and <strong class="text-primary font-mono">w &middot; u = 0</strong>, with <strong class="text-primary font-mono">|w| = &radic;30</strong>, determine the magnitude of scalar projection of <strong class="text-primary font-mono">w</strong> along <strong class="text-primary font-mono">v</strong>.
      </p>
    </div>
    <div class="flex flex-col gap-2" id="mcqOptions">
      <button onclick="selectOption(this, 'A')" class="opt-btn w-full p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high text-left flex items-center gap-3 transition-all active:scale-[0.99]">
        <span class="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center font-mono font-bold text-sm text-on-surface">A</span>
        <span class="font-body-md text-on-surface">3&radic;5 / 2</span>
      </button>
      <button onclick="selectOption(this, 'B')" class="opt-btn w-full p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high text-left flex items-center gap-3 transition-all active:scale-[0.99]">
        <span class="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center font-mono font-bold text-sm text-on-surface">B</span>
        <span class="font-body-md text-on-surface">5</span>
      </button>
      <button onclick="selectOption(this, 'C')" class="opt-btn w-full p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high text-left flex items-center gap-3 transition-all active:scale-[0.99]">
        <span class="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center font-mono font-bold text-sm text-on-surface">C</span>
        <span class="font-body-md text-on-surface">&radic;15</span>
      </button>
      <button onclick="selectOption(this, 'D')" class="opt-btn w-full p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high text-left flex items-center gap-3 transition-all active:scale-[0.99]">
        <span class="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center font-mono font-bold text-sm text-on-surface">D</span>
        <span class="font-body-md text-on-surface">2&radic;6</span>
      </button>
    </div>
  </div>

  <div class="flex items-center justify-between pt-space-sm border-t border-surface-container-high gap-2">
    <button onclick="prevQuestion()" class="py-2.5 px-4 rounded-xl bg-surface-container-high text-on-surface font-label-md">Previous</button>
    <div class="flex items-center gap-2">
      <button onclick="flagQuestion()" class="p-2.5 rounded-xl bg-surface-container-high text-secondary"><span class="material-symbols-outlined text-[20px]">bookmark</span></button>
      <button onclick="submitTest()" class="py-2.5 px-6 rounded-xl bg-primary-container text-on-primary font-headline-md font-bold shadow-[0_0_16px_rgba(0,240,255,0.4)] active:scale-95 transition-all">Submit Test</button>
    </div>
  </div>
</div>
"""

home_scripts = """
<script>
  // Test Arena Logic
  const arena = document.getElementById('testArenaModal');
  const resumeBtn = document.getElementById('resumeTestBtn');
  let testTimerInterval = null;
  let timerSeconds = 14 * 60 - 2;

  function openTestArena() {
    if (!arena) return;
    arena.classList.remove('hidden');
    startTestTimer();
  }

  function closeTestArena() {
    if (!arena) return;
    arena.classList.add('hidden');
    clearInterval(testTimerInterval);
  }

  function startTestTimer() {
    clearInterval(testTimerInterval);
    const timerEl = document.getElementById('testTimer');
    testTimerInterval = setInterval(() => {
      timerSeconds--;
      if (timerSeconds <= 0) {
        clearInterval(testTimerInterval);
        alert('Test session expired!');
        closeTestArena();
        return;
      }
      const m = Math.floor(timerSeconds / 60);
      const s = timerSeconds % 60;
      if (timerEl) timerEl.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
    }, 1000);
  }

  function selectOption(btn, opt) {
    document.querySelectorAll('.opt-btn').forEach(b => {
      b.className = 'opt-btn w-full p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high text-left flex items-center gap-3 transition-all active:scale-[0.99]';
      const indicator = b.querySelector('span');
      if (indicator) indicator.className = 'w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center font-mono font-bold text-sm text-on-surface';
    });
    btn.className = 'opt-btn w-full p-space-md rounded-xl bg-primary-container/20 border border-primary-container/60 text-left flex items-center gap-3 transition-all shadow-[0_0_12px_rgba(0,240,255,0.2)]';
    const activeInd = btn.querySelector('span');
    if (activeInd) activeInd.className = 'w-7 h-7 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-mono font-bold text-sm';
  }

  function prevQuestion() {
    alert('Moving to Question 16...');
  }

  function flagQuestion() {
    alert('Question 17 flagged for review in HUD palette.');
  }

  function submitTest() {
    clearInterval(testTimerInterval);
    arena.classList.add('hidden');
    alert('Session successfully synced to Supabase! Directing to Progress Telemetry...');
    window.location.href = 'progress.html';
  }

  resumeBtn?.addEventListener('click', openTestArena);
</script>
"""

# Insert test arena modal before </main>
home = home.replace('</main>', test_arena_modal + '</main>')
home = home.replace('</body>', home_scripts + '</body>')

with open('home.html', 'w', encoding='utf-8') as f:
    f.write(home)
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(home)
print("Enhanced home.html & index.html successfully.")

# ==========================================
# 2. ENHANCE PRACTICE.HTML
# ==========================================
with open('practice.html', 'r', encoding='utf-8') as f:
    practice = f.read()

# Add Practice Builder Modal and Review Solutions Modal
practice_modals = """
<!-- Custom Practice Builder Sheet Modal -->
<div id="practiceBuilderSheet" class="hidden fixed inset-0 z-50 bg-surface/90 backdrop-blur-md flex flex-col justify-end p-margin pb-safe animate-fade-in">
  <div class="w-full bg-surface-container rounded-2xl p-space-md shadow-2xl flex flex-col gap-space-md border border-surface-container-highest">
    <div class="flex items-center justify-between pb-1 border-b border-surface-container-highest">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-primary-container text-[22px]">tune</span>
        <span class="font-headline-md text-[18px] text-on-surface font-semibold">Custom Practice Builder</span>
      </div>
      <button onclick="closePracticeBuilder()" class="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center">
        <span class="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
    
    <!-- Subject Selection -->
    <div class="flex flex-col gap-1.5">
      <span class="font-label-sm text-outline uppercase font-semibold">1. Select Target Domain</span>
      <div class="grid grid-cols-2 gap-2" id="builderSubjects">
        <button onclick="pickBuilderSubject(this)" class="builder-sub-btn p-2.5 rounded-xl bg-primary-container text-on-primary font-label-md font-semibold text-center shadow-md">Physics</button>
        <button onclick="pickBuilderSubject(this)" class="builder-sub-btn p-2.5 rounded-xl bg-surface-container-high text-on-surface font-label-md font-semibold text-center">Chemistry</button>
        <button onclick="pickBuilderSubject(this)" class="builder-sub-btn p-2.5 rounded-xl bg-surface-container-high text-on-surface font-label-md font-semibold text-center">Mathematics</button>
        <button onclick="pickBuilderSubject(this)" class="builder-sub-btn p-2.5 rounded-xl bg-surface-container-high text-on-surface font-label-md font-semibold text-center">Biology</button>
      </div>
    </div>

    <!-- Question Volume Count -->
    <div class="flex flex-col gap-1.5">
      <span class="font-label-sm text-outline uppercase font-semibold">2. Problem Count</span>
      <div class="grid grid-cols-3 gap-2" id="builderCounts">
        <button onclick="pickBuilderCount(this)" class="builder-count-btn p-2 rounded-xl bg-surface-container-high text-on-surface font-stat-md text-center">10 Qs</button>
        <button onclick="pickBuilderCount(this)" class="builder-count-btn p-2 rounded-xl bg-primary-container text-on-primary font-stat-md text-center shadow-md">25 Qs</button>
        <button onclick="pickBuilderCount(this)" class="builder-count-btn p-2 rounded-xl bg-surface-container-high text-on-surface font-stat-md text-center">50 Qs</button>
      </div>
    </div>

    <!-- Mode Selector -->
    <div class="flex flex-col gap-1.5">
      <span class="font-label-sm text-outline uppercase font-semibold">3. Environment Mode</span>
      <div class="grid grid-cols-2 gap-2">
        <button onclick="pickBuilderMode(this, 'timed')" class="builder-mode-btn p-2.5 rounded-xl bg-secondary text-on-secondary font-label-md font-semibold flex items-center justify-center gap-1.5">
          <span class="material-symbols-outlined text-[16px]">timer</span>
          <span>Timed Sprint</span>
        </button>
        <button onclick="pickBuilderMode(this, 'zen')" class="builder-mode-btn p-2.5 rounded-xl bg-surface-container-high text-on-surface font-label-md font-semibold flex items-center justify-center gap-1.5">
          <span class="material-symbols-outlined text-[16px]">self_improvement</span>
          <span>Zen Untimed</span>
        </button>
      </div>
    </div>

    <button onclick="startBuiltPractice()" class="w-full py-3.5 rounded-xl bg-primary-container text-on-primary font-headline-md font-bold tracking-wide flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.4)] active:scale-95 transition-all">
      <span class="material-symbols-outlined text-[20px]">bolt</span>
      <span>Generate &amp; Launch Arena</span>
    </button>
  </div>
</div>

<!-- Solutions Breakdown Sheet Modal -->
<div id="solutionsSheet" class="hidden fixed inset-0 z-50 bg-surface/90 backdrop-blur-md flex flex-col justify-end p-margin pb-safe animate-fade-in">
  <div class="w-full bg-surface-container rounded-2xl p-space-md shadow-2xl flex flex-col gap-space-md border border-surface-container-highest max-h-[85vh] overflow-y-auto">
    <div class="flex items-center justify-between pb-1 border-b border-surface-container-highest">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-tertiary-container text-[22px]">gavel</span>
        <span class="font-headline-md text-[18px] text-on-surface font-semibold">CBSE Class 12 Physics 2023 - Marking Scheme</span>
      </div>
      <button onclick="closeSolutions()" class="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center">
        <span class="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
    <div class="flex flex-col gap-3">
      <div class="p-3 rounded-xl bg-surface-container-high/60 flex flex-col gap-1">
        <div class="flex justify-between items-center">
          <span class="font-label-md text-primary font-bold">Q14. Gauss Law in Cylindrical Symmetry</span>
          <span class="px-2 py-0.5 rounded bg-tertiary/10 text-tertiary font-label-sm font-bold">[3 Marks]</span>
        </div>
        <p class="font-body-sm text-on-surface-variant mt-1">
          &bull; <strong>Derivation Step 1:</strong> Gaussian cylinder coaxial with line charge: &Phi; = E &middot; 2&pi;rl [1 Mark]<br/>
          &bull; <strong>Step 2:</strong> Charge enclosed q = &lambda;l. By Gauss Theorem, &Phi; = q / &epsilon;<sub>0</sub> [1 Mark]<br/>
          &bull; <strong>Step 3:</strong> Equating gives E = &lambda; / (2&pi;&epsilon;<sub>0</sub>r) with radial vector orientation [1 Mark].
        </p>
      </div>
      <div class="p-3 rounded-xl bg-surface-container-high/60 flex flex-col gap-1">
        <div class="flex justify-between items-center">
          <span class="font-label-md text-primary font-bold">Q22. LCR Series Resonance Condition</span>
          <span class="px-2 py-0.5 rounded bg-tertiary/10 text-tertiary font-label-sm font-bold">[5 Marks]</span>
        </div>
        <p class="font-body-sm text-on-surface-variant mt-1">
          Phasor diagram for V<sub>L</sub> and V<sub>C</sub> opposing (180&deg; out of phase). Resonance occurs when &omega;L = 1/(&omega;C) &rArr; &omega;<sub>0</sub> = 1/&radic;(LC). Impedance Z = R (minimum), power factor cos &phi; = 1 (maximum).
        </p>
      </div>
    </div>
    <button onclick="closeSolutions()" class="py-2.5 px-4 rounded-xl bg-surface-container-highest text-on-surface font-label-md font-semibold">Dismiss</button>
  </div>
</div>
""" + test_arena_modal

practice_scripts = """
<script>
  // Filter pills interactive toggle
  document.querySelectorAll('.no-scrollbar button').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.no-scrollbar button').forEach(b => {
        b.className = 'flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm active:bg-surface-container-highest transition-colors';
      });
      this.className = 'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm shadow-[0_0_12px_rgba(0,240,255,0.35)] transition-all';
    });
  });

  // Test Arena Modal
  const arena = document.getElementById('testArenaModal');
  let testTimerInterval = null;
  let timerSeconds = 180 * 60;

  function launchTest(paperName) {
    if (!arena) return;
    const titleEl = arena.querySelector('.font-headline-md');
    if (titleEl && paperName) titleEl.textContent = paperName;
    arena.classList.remove('hidden');
    startTestTimer();
  }

  function closeTestArena() {
    if (!arena) return;
    arena.classList.add('hidden');
    clearInterval(testTimerInterval);
  }

  function startTestTimer() {
    clearInterval(testTimerInterval);
    const timerEl = document.getElementById('testTimer');
    testTimerInterval = setInterval(() => {
      timerSeconds--;
      if (timerSeconds <= 0) {
        clearInterval(testTimerInterval);
        alert('Test session expired!');
        closeTestArena();
        return;
      }
      const m = Math.floor(timerSeconds / 60);
      const s = timerSeconds % 60;
      if (timerEl) timerEl.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
    }, 1000);
  }

  function selectOption(btn, opt) {
    document.querySelectorAll('.opt-btn').forEach(b => {
      b.className = 'opt-btn w-full p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high text-left flex items-center gap-3 transition-all active:scale-[0.99]';
      const ind = b.querySelector('span');
      if (ind) ind.className = 'w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center font-mono font-bold text-sm text-on-surface';
    });
    btn.className = 'opt-btn w-full p-space-md rounded-xl bg-primary-container/20 border border-primary-container/60 text-left flex items-center gap-3 transition-all shadow-[0_0_12px_rgba(0,240,255,0.2)]';
    const activeInd = btn.querySelector('span');
    if (activeInd) activeInd.className = 'w-7 h-7 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-mono font-bold text-sm';
  }

  function prevQuestion() {
    alert('Moving to previous question...');
  }

  function flagQuestion() {
    alert('Question flagged for review!');
  }

  function submitTest() {
    clearInterval(testTimerInterval);
    arena.classList.add('hidden');
    alert('Paper successfully submitted! Scores calibrated with remote grading schema.');
    window.location.href = 'progress.html';
  }

  // Connect Card 1 Start Test Mode
  const startBtn1 = document.querySelector('button span.material-symbols-outlined + span')?.parentElement;
  
  // Custom Practice Builder Sheet
  const builderSheet = document.getElementById('practiceBuilderSheet');
  function openPracticeBuilder() {
    builderSheet?.classList.remove('hidden');
  }
  function closePracticeBuilder() {
    builderSheet?.classList.add('hidden');
  }
  function pickBuilderSubject(btn) {
    document.querySelectorAll('.builder-sub-btn').forEach(b => {
      b.className = 'builder-sub-btn p-2.5 rounded-xl bg-surface-container-high text-on-surface font-label-md font-semibold text-center';
    });
    btn.className = 'builder-sub-btn p-2.5 rounded-xl bg-primary-container text-on-primary font-label-md font-semibold text-center shadow-md';
  }
  function pickBuilderCount(btn) {
    document.querySelectorAll('.builder-count-btn').forEach(b => {
      b.className = 'builder-count-btn p-2 rounded-xl bg-surface-container-high text-on-surface font-stat-md text-center';
    });
    btn.className = 'builder-count-btn p-2 rounded-xl bg-primary-container text-on-primary font-stat-md text-center shadow-md';
  }
  function pickBuilderMode(btn, mode) {
    document.querySelectorAll('.builder-mode-btn').forEach(b => {
      b.className = 'builder-mode-btn p-2.5 rounded-xl bg-surface-container-high text-on-surface font-label-md font-semibold flex items-center justify-center gap-1.5';
    });
    btn.className = 'builder-mode-btn p-2.5 rounded-xl bg-secondary text-on-secondary font-label-md font-semibold flex items-center justify-center gap-1.5';
  }
  function startBuiltPractice() {
    closePracticeBuilder();
    launchTest('Custom Targeted Adaptive Drill');
  }

  // Solutions Sheet
  const solSheet = document.getElementById('solutionsSheet');
  function openSolutions() {
    solSheet?.classList.remove('hidden');
  }
  function closeSolutions() {
    solSheet?.classList.add('hidden');
  }

  // Wire buttons in practice cards
  document.querySelectorAll('button').forEach(b => {
    const text = b.textContent.trim();
    if (text.includes('Start Test Mode')) {
      b.onclick = () => launchTest('JEE Advanced 2024 Paper 2');
    } else if (text.includes('Review Solutions')) {
      b.onclick = () => openSolutions();
    } else if (text.includes('Solve')) {
      b.onclick = () => launchTest('CBSE Class 12 Physics 2023');
    } else if (text.includes('Launch Rapid Diagnostic')) {
      b.onclick = () => launchTest('NEET 2024 Biology Rapid Diagnostic');
    } else if (text.includes('Build Session')) {
      b.onclick = () => openPracticeBuilder();
    }
  });
</script>
"""

# Insert practice modals before </main>
practice = practice.replace('</main>', practice_modals + '</main>')
practice = practice.replace('</body>', practice_scripts + '</body>')

with open('practice.html', 'w', encoding='utf-8') as f:
    f.write(practice)
print("Enhanced practice.html successfully.")

# ==========================================
# 3. ENHANCE PROFILE.HTML
# ==========================================
with open('profile.html', 'r', encoding='utf-8') as f:
    profile = f.read()

profile_extra_script = """
<script>
  // Telemetry Export functionality
  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.includes('Export Performance Telemetry')) {
      btn.onclick = () => {
        const payload = {
          candidate: "Ananya Sharma",
          examGoal: "JEE Advanced 2025",
          targetInstitution: "IIT Bombay CS",
          estimatedAirRank: 412,
          currentAccuracy: "89.4%",
          syncStreakDays: 7,
          totalQuestionsSolved: 1280,
          topicProficiencies: {
            electromagnetism: 0.92,
            organicMechanisms: 0.81,
            thermodynamics: 0.68,
            rotationalDynamics: 0.54
          },
          security: {
            authMode: "Telegram 2FA + Phone OTP",
            deviceVault: "Capacitor Secure Storage",
            cipher: "SHA-512"
          },
          timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'statxam_cadet_telemetry_2025.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        const toast = document.getElementById('status-toast');
        const toastMsg = document.getElementById('toast-message');
        if (toast && toastMsg) {
          toastMsg.textContent = 'Downloaded statxam_cadet_telemetry_2025.json';
          toast.classList.remove('translate-y-32', 'opacity-0');
          toast.classList.add('translate-y-0', 'opacity-100');
          setTimeout(() => {
            toast.classList.remove('translate-y-0', 'opacity-100');
            toast.classList.add('translate-y-32', 'opacity-0');
          }, 2600);
        }
      };
    }
  });

  // Interactive toggle switches in Preferences
  document.querySelectorAll('button[aria-label*="active"]').forEach(switchBtn => {
    switchBtn.addEventListener('click', function() {
      const thumb = this.querySelector('span');
      const isChecked = thumb.classList.contains('translate-x-6');
      if (isChecked) {
        thumb.classList.remove('translate-x-6');
        thumb.classList.add('translate-x-0');
        this.classList.remove('bg-primary-container');
        this.classList.add('bg-surface-container-highest');
      } else {
        thumb.classList.remove('translate-x-0');
        thumb.classList.add('translate-x-6');
        this.classList.remove('bg-surface-container-highest');
        this.classList.add('bg-primary-container');
      }
    });
  });
</script>
"""
profile = profile.replace('</body>', profile_extra_script + '</body>')

with open('profile.html', 'w', encoding='utf-8') as f:
    f.write(profile)
print("Enhanced profile.html successfully.")

# ==========================================
# 4. ENHANCE AI-TUTOR.HTML
# ==========================================
with open('ai-tutor.html', 'r', encoding='utf-8') as f:
    ai_tutor = f.read()

# Auto-open camera if navigated via ?action=camera
ai_tutor_extra = """
<script>
  window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'camera') {
      openSheet();
    }
  });
</script>
"""
ai_tutor = ai_tutor.replace('</body>', ai_tutor_extra + '</body>')

with open('ai-tutor.html', 'w', encoding='utf-8') as f:
    f.write(ai_tutor)
print("Enhanced ai-tutor.html successfully.")

print("All enhancements completed!")
