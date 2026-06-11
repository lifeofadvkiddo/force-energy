/* ========================================================
   GAME STATE
======================================================== */
const state = {
  currentLevel: 0,
  completedLevels: new Set(),
  l1QuestionIndex: 0,
  l2QuestionIndex: 0,
  l2Done: false,
  l3TappedCount: 0,
  l3Tapped: new Set(),
  l4MagnetUsed: false,
  challengeIndex: 0,
  challengeScore: 0,
  quizLevel: 0,
};

/* ========================================================
   AUDIO NARRATION — Web Speech API (Lady Voice)
======================================================== */
const narrator = {
  muted: false,
  voice: null,

  loadVoice() {
    const voices = window.speechSynthesis.getVoices();
    const preferred = [
      'Microsoft Zira', 'Microsoft Jenny', 'Microsoft Aria',
      'Google UK English Female', 'Samantha', 'Karen',
      'Moira', 'Tessa', 'Fiona',
    ];
    for (const name of preferred) {
      const v = voices.find(v => v.name.includes(name));
      if (v) { this.voice = v; return; }
    }
    this.voice =
      voices.find(v => v.name.toLowerCase().includes('female') && v.lang.startsWith('en')) ||
      voices.find(v => v.lang.startsWith('en-')) ||
      voices[0] || null;
  },

  speak(text, delay = 0) {
    if (this.muted || !text) return;
    window.speechSynthesis.cancel();
    const go = () => {
      const utter = new SpeechSynthesisUtterance(text);
      if (this.voice) utter.voice = this.voice;
      utter.lang   = 'en-US';
      utter.rate   = 0.9;
      utter.pitch  = 1.1;
      utter.volume = 1;
      window.speechSynthesis.speak(utter);
    };
    delay > 0 ? setTimeout(go, delay) : go();
  },

  stop() { window.speechSynthesis.cancel(); },

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stop();
    const btn = document.getElementById('narrator-btn');
    if (btn) btn.textContent = this.muted ? '🔇' : '🔊';
  }
};
window.speechSynthesis.onvoiceschanged = () => narrator.loadVoice();
narrator.loadVoice();

/* ========================================================
   SCREEN MANAGEMENT
======================================================== */
function showScreen(name) {
  narrator.stop();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + name);
  if (target) target.classList.add('active');
  if (name === 'map') updateMap();
  if (name === 'final') launchCelebration();
}

function startLevel(n) {
  const card = document.getElementById('map-' + n);
  if (card && card.classList.contains('locked')) return;
  state.currentLevel = n;
  showScreen('level' + n);
  if (n === 1) initLevel1Quiz();
  if (n === 2) initLevel2Quiz();   // FIX: was missing
  if (n === 4) initMagnet();
  if (n === 5) initChallenge();
}

/* ========================================================
   MAP UPDATE
======================================================== */
function updateMap() {
  const completed = state.completedLevels;
  const total = completed.size;
  document.getElementById('map-progress').style.width = (total / 2 * 100) + '%';
  document.getElementById('map-progress-text').textContent = total + ' / 2 Worlds Completed';

  for (let i = 1; i <= 2; i++) {
    const card = document.getElementById('map-' + i);
    const lock = document.getElementById('lock-' + i);
    if (!card) continue;

    if (completed.has(i)) {
      card.classList.remove('locked');
      card.classList.add('completed');
      if (lock) lock.style.display = 'none';

      // Update action chip text
      const statusChip = card.querySelector('.map-status-chip');
      if (statusChip) {
        statusChip.textContent = 'COMPLETED';
        statusChip.className = 'map-status-chip map-status-open';
      }
      const actionDiv = card.querySelector('.map-card-action span:first-child');
      if (actionDiv) actionDiv.textContent = 'Play Again';
    } else if (i === 1 || completed.has(i - 1)) {
      // Unlocked but not yet completed
      card.classList.remove('locked');
      if (lock) lock.style.display = 'none';

      const statusChip = card.querySelector('.map-status-chip');
      if (statusChip) {
        statusChip.textContent = 'READY';
        statusChip.className = 'map-status-chip map-status-open';
      }
      const actionDiv = card.querySelector('.map-card-action span:first-child');
      if (actionDiv) actionDiv.textContent = 'Start Exploring';
      // Replace lock emoji arrow with plain arrow
      const arrowSpan = card.querySelector('.map-arrow');
      if (arrowSpan) arrowSpan.textContent = '→';
    } else {
      card.classList.add('locked');
      if (lock) lock.style.display = 'block';
    }
  }

  // No final challenge tile needed
}

function showFinalChallengeTile() {
  if (document.getElementById('map-final')) return;
  const grid = document.querySelector('.map-grid');
  const tile = document.createElement('div');
  tile.className = 'map-card';
  tile.id = 'map-final';
  tile.style.gridColumn = '1 / -1';
  tile.style.background = 'linear-gradient(135deg,#fff9c4,#ffe082)';
  tile.innerHTML = `
    <span class="card-icon" style="animation-delay:.5s">🕵️</span>
    <div class="card-label">Force Detective!</div>
    <div class="card-sub">⚡ Final Challenge</div>`;
  tile.onclick = () => { initChallenge(); showScreen('challenge'); };
  grid.appendChild(tile);
}

/* ========================================================
   LEVEL 1: FORCE EXPLORER QUIZ
======================================================== */
const l1ForceQuestions = [
  {
    question: 'Why is the parachute falling slowly? What is the force?',
    acceptedAnswers: ['frictional force'],
    caption: 'The parachute floats down slowly through the air.',
    sceneHTML: `
      <img class="scene-img quizcloud-img quizcloud-img-1" src="images/force-quiz/cloud1.png" alt="Cloud">
      <img class="scene-img quizcloud-img quizcloud-img-2" src="images/force-quiz/cloud2.png" alt="Cloud">
      <img class="scene-img scene-parachute-img" src="images/force-quiz/parachute.png" alt="Parachute">
    `
   },
  {
  question: 'A football is moving when someone kicks it. What is the force?',
  acceptedAnswers: ['muscular force'],
  caption: 'The football moves because a boy kicks it with his muscles.',
  sceneHTML: `
    <img class="scene-img scene-boy-kick-img" src="images/force-quiz/boy-kicking.png" alt="Boy kicking football">
    <img class="scene-img scene-ball-move-img" src="images/force-quiz/ball.png" alt="Football">
  `
},
  {
    question: 'Why does the apple fall down from the tree? What is the force?',
    acceptedAnswers: ['gravitational force'],
    caption: 'The apple falls down toward the ground.',
    sceneHTML: `
      <img class="scene-img quizcloud-img quizcloud-img-1" src="images/force-quiz/cloud1.png" alt="Cloud">
      <img class="scene-img quizcloud-img quizcloud-img-2" src="images/force-quiz/cloud2.png" alt="Cloud">
      <img class="scene-img scene-apple-img" src="images/force-quiz/apple.png" alt="Apple">
    `
  },
  {
    question: 'The paper clip moves toward the magnet. What is the force?',
    acceptedAnswers: ['magnetic force'],
    caption: 'The magnet pulls the paper clip toward it.',
    sceneHTML: `
      <img class="scene-img scene-magnet-img" src="images/force-quiz/magnet.png" alt="Magnet">
      <img class="scene-img scene-paperclip-img" src="images/force-quiz/paperclip.png" alt="Paper Clip">
    `
  },
  {
    question: 'A suitcase is being pulled forward. What is the force?',
    acceptedAnswers: ['muscular force'],
    caption: 'The suitcase moves because someone pulls it with muscles.',
    sceneHTML: `
      <img class="scene-img scene-suitcase-img" src="images/force-quiz/suitcase.png" alt="Suitcase">
    `
  },
  {
  question: 'A toy car slows down on a rough road. What is the force?',
  acceptedAnswers: ['frictional force'],
  caption: 'The rough road slows the car down.',
  sceneHTML: `
  <img class="scene-img quizcloud-img quizcloud-img-1" src="images/force-quiz/cloud1.png" alt="Cloud">
      <img class="scene-img quizcloud-img quizcloud-img-2" src="images/force-quiz/cloud2.png" alt="Cloud">
    <img
      class="scene-img rough-road-image" src="images/force-quiz/road.png" alt="Rough road">

    <img
      class="scene-img scene-car-img" src="images/force-quiz/car.png" alt="Toy car" >
  `
},
  {
    question: 'An iron nail moves toward a magnet. What is the force?',
    acceptedAnswers: ['magnetic force'],
    caption: 'The magnet attracts the iron nail.',
    sceneHTML: `
      <img class="scene-img scene-magnet-img" src="images/force-quiz/magnet.png" alt="Magnet">
      <img class="scene-img scene-nail-img" src="images/force-quiz/nail.png" alt="Nail">
    `
  },
  {
    question: 'Why does the stone fall to the ground? What is the force?',
    acceptedAnswers: ['gravitational force'],
    caption: 'The stone drops down because Earth pulls it.',
    sceneHTML: `
    <img class="scene-img quizcloud-img quizcloud-img-1" src="images/force-quiz/cloud1.png" alt="Cloud">
      <img class="scene-img quizcloud-img quizcloud-img-2" src="images/force-quiz/cloud2.png" alt="Cloud">
      <img class="scene-img scene-stone-img" src="images/force-quiz/stone.png" alt="Stone">
    `
  }
  
];

function initLevel1Quiz() {
  state.l1QuestionIndex = 0;
  renderLevel1Question();

  const input = document.getElementById('l1-answer-input');
  if (input && !input.dataset.boundEnter) {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        checkL1Answer();
      }
    });
    input.dataset.boundEnter = 'true';
  }
}

function normalizeForceAnswer(text) {
  return text.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function renderLevel1Question() {
  const current = l1ForceQuestions[state.l1QuestionIndex];
  if (!current) return;

  const stage = document.getElementById('l1-scene-stage');
  const caption = document.getElementById('l1-scene-caption');
  const progress = document.getElementById('l1-progress');
  const question = document.getElementById('l1-question');
  const input = document.getElementById('l1-answer-input');
  const feedback = document.getElementById('l1-feedback');
  const submitBtn = document.getElementById('l1-submit-btn');

  if (stage) stage.innerHTML = current.sceneHTML;
  if (caption) caption.textContent = current.caption;
  if (progress) progress.textContent = `Question ${state.l1QuestionIndex + 1} / ${l1ForceQuestions.length}`;
  if (question) question.textContent = current.question;
  if (input) {
    input.value = '';
    input.disabled = false;
    input.focus();
  }
  if (submitBtn) submitBtn.disabled = false;
  if (feedback) {
    feedback.textContent = '';
    feedback.className = 'l1-feedback';
  }
  // Narrate the question
  if (current) narrator.speak(current.question, 400);
}

function checkL1Answer() {
  const current = l1ForceQuestions[state.l1QuestionIndex];
  const input = document.getElementById('l1-answer-input');
  const feedback = document.getElementById('l1-feedback');
  const submitBtn = document.getElementById('l1-submit-btn');

  if (!current || !input || !feedback) return;

  const userAnswer = normalizeForceAnswer(input.value);
  if (!userAnswer) {
    feedback.textContent = 'Please type your answer first.';
    feedback.className = 'l1-feedback bad';
    return;
  }

  const isCorrect = current.acceptedAnswers.some(answer => normalizeForceAnswer(answer) === userAnswer);

  if (isCorrect) {
    feedback.textContent = 'Correct! Loading the next question...';
    feedback.className = 'l1-feedback good';
    // narrator.speak('Correct! Great job!');
    input.disabled = true;

    if (submitBtn) {
      burstStars(submitBtn);
      submitBtn.disabled = true;
    }

    setTimeout(() => {
      if (state.l1QuestionIndex < l1ForceQuestions.length - 1) {
        state.l1QuestionIndex += 1;
        renderLevel1Question();
      } else {
        // All questions answered — mark Level 1 complete
        if (!state.completedLevels.has(1)) {
          state.completedLevels.add(1);
          // Update map so Level 2 card becomes unlocked immediately
          updateMap();
        }
        showLevelComplete(1);
      }
    }, 1000);
  } else {
    feedback.textContent = 'Not quite. Try again!';
    feedback.className = 'l1-feedback bad';
    narrator.speak('Not quite. Try again!');
  }
}

/* ========================================================
   LEVEL 2: ENERGY QUIZ
======================================================== */
const l2EnergyQuestions = [
  {
    question: 'Which source is renewable?',
    acceptedAnswers: ['windmill'],
    caption: 'Think about energy that comes from nature and can be replenished.',
    sceneHTML: `
      <img class="scene-img scene-coal" src="images/energy-quiz/coal.png" alt="Coal">
      <img class="scene-img scene-wind" src="images/energy-quiz/windmill.png" alt="Wind Turbine">
      <img class="scene-img scene-gas" src="images/energy-quiz/gas.png" alt="Natural Gas">
      <img class="scene-img scene-petrol" src="images/energy-quiz/petrol.png" alt="Fuel can">
      <img class="scene-img scene-book" src="images/energy-quiz/book.png" alt="Book">
      <img class="scene-img scene-wood" src="images/energy-quiz/wood.png" alt="Wood">
    `
  },
  {
    question: 'Which source is non-renewable?',
    acceptedAnswers: ['coal', 'oil', 'natural gas'],
    caption: 'Consider energy sources that can run out if we use them too much.',
    sceneHTML: `
      <img src="images/energy-quiz/coal.png" alt="Coal" style="position: absolute; width: 200px; top: 250px; left: 40%; z-index: 2; animation: float-coal 3s ease-in-out infinite alternate;">
      <img class="scene-img scene-crops" src="images/energy-quiz/crops.png" alt="Crops">
      <img class="scene-img scene-water" src="images/energy-quiz/water.png" alt="Flowing Water">
      <img class="scene-img scene-sun" src="images/energy-quiz/sun.png" alt="Sun">
      <img class="scene-img scene-wind" src="images/energy-quiz/windmill.png" alt="Wind Turbine">
      <img class="scene-img scene-air" src="images/energy-quiz/air.png" alt="Air">
    `
  },
  {
    question: 'Which energy comes from moving water?',
    acceptedAnswers: ['hydropower', 'hydroelectric'],
    caption: 'Think of rivers or dams creating energy as water flows.',
    sceneHTML: `
      <img class="scene-img scene-water" src="images/energy-quiz/water.png" alt="Flowing Water">
      <img class="scene-img scene-sun" src="images/energy-quiz/sun.png" alt="Sun">
      <img class="scene-img scene-wind" src="images/energy-quiz/windmill.png" alt="Wind Turbine">
      <img class="scene-img scene-air" src="images/energy-quiz/air.png" alt="Air">
      <img class="scene-img scene-wood" src="images/energy-quiz/wood.png" alt="Wood">
      <img class="scene-img scene-crops" src="images/energy-quiz/crops.png" alt="Crops">

    `
  },
  {
    question: 'Which energy is produced from the sun light?',
    acceptedAnswers: ['solar energy'],
    caption: 'Consider what gives light and warmth to the Earth every day.',
    sceneHTML: `
      <img class="scene-img scene-sun" src="images/energy-quiz/sun.png" alt="Sun">
      <img class="scene-img scene-wind" src="images/energy-quiz/windmill.png" alt="Wind Turbine">
      <img class="scene-img scene-air" src="images/energy-quiz/air.png" alt="Air">
      <img src="images/energy-quiz/coal.png" alt="Coal" style="position: absolute; width: 200px; top: 250px; left: 40%; z-index: 2; animation: float-coal 3s ease-in-out infinite alternate;">
      <img class="scene-img scene-crops" src="images/energy-quiz/crops.png" alt="Crops">
      <img class="scene-img scene-water" src="images/energy-quiz/water.png" alt="Flowing Water">
    `
  },
  {
    question: 'Which energy is stored in a battery?',
    acceptedAnswers: ['chemical energy'],
    caption: 'Think about the kind of energy that can power devices when needed.',
    sceneHTML: `
      <img class="scene-img scene-battery" src="images/energy-quiz/battery.png" alt="Battery">
      <img class="scene-img scene-crops" src="images/energy-quiz/crops.png" alt="Crops">
      <img class="scene-img scene-water" src="images/energy-quiz/water.png" alt="Flowing Water">
      <img class="scene-img scene-sun" src="images/energy-quiz/sun.png" alt="Sun">
      <img class="scene-img scene-wind" src="images/energy-quiz/windmill.png" alt="Wind Turbine">
      <img class="scene-img scene-air" src="images/energy-quiz/air.png" alt="Air">
    `
  },
  {
    question: 'Which energy is produced from windmills?',
    acceptedAnswers: ['wind energy'],
    caption: 'Think about energy created when air moves fast across turbines.',
    sceneHTML: `
      <img class="scene-img scene-wind" src="images/energy-quiz/windmill.png" alt="Wind Turbine">
      <img class="scene-img scene-crops" src="images/energy-quiz/crops.png" alt="Crops">
      <img class="scene-img scene-water" src="images/energy-quiz/water.png" alt="Flowing Water">
      <img class="scene-img scene-sun" src="images/energy-quiz/sun.png" alt="Sun">
      <img class="scene-img scene-wood" src="images/energy-quiz/wood.png" alt="Wood">
     <img class="scene-img scene-gas" src="images/energy-quiz/gas.png" alt="Natural Gas">


    `
  },
  {
    question: 'Which of these is a fossil fuel?',
    acceptedAnswers: ['coal', 'oil', 'natural gas'],
    caption: 'Consider fuels formed from plants and animals long ago.',
    sceneHTML: `
      <img class="scene-img scene-oil" src="images/energy-quiz/oil.png" alt="Oil Barrel">
      <img class="scene-img scene-sun" src="images/energy-quiz/sun.png" alt="Sun">
      <img class="scene-img scene-air" src="images/energy-quiz/air.png" alt="Air">
      <img class="scene-img scene-crops" src="images/energy-quiz/crops.png" alt="Crops">
      <img class="scene-img scene-water" src="images/energy-quiz/water.png" alt="Flowing Water">
      <img class="scene-img scene-wood" src="images/energy-quiz/wood.png" alt="Wood">

    `
  },
  {
     question: 'Which energy comes from burning wood or plants?',
  acceptedAnswers: ['biomass energy'],
  caption: 'This energy comes from plants and can be burned to make heat or electricity.',
  sceneHTML: `
      <img class="scene-img scene-oil" src="images/energy-quiz/oil.png" alt="Oil Barrel">
      <img class="scene-img scene-sun" src="images/energy-quiz/sun.png" alt="Sun">
      <img class="scene-img scene-air" src="images/energy-quiz/air.png" alt="Air">
      <img src="images/energy-quiz/coal.png" alt="Coal" style="position: absolute; width: 200px; top: 250px; left: 35%; z-index: 2; animation: float-coal 3s ease-in-out infinite alternate;">
      <img class="scene-img scene-woodburning" src="images/energy-quiz/wood burning.png" alt="Wood Burning">
      <img class="scene-img scene-water" src="images/energy-quiz/water.png" alt="Flowing Water">

    `
  }
];

function initLevel2Quiz() {
  state.l2QuestionIndex = 0;
  renderLevel2Question();

  const input = document.getElementById('l2-answer-input');
  if (input && !input.dataset.boundEnter) {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        checkL2Answer();
      }
    });
    input.dataset.boundEnter = 'true';
  }
}

function renderLevel2Question() {
  const current = l2EnergyQuestions[state.l2QuestionIndex];
  if (!current) return;

  const stage = document.getElementById('l2-scene-stage');
  const caption = document.getElementById('l2-scene-caption');
  const progress = document.getElementById('l2-progress');
  const question = document.getElementById('l2-question');
  const input = document.getElementById('l2-answer-input');
  const feedback = document.getElementById('l2-feedback');
  const submitBtn = document.getElementById('l2-submit-btn');

  if (stage) stage.innerHTML = current.sceneHTML;
  if (caption) caption.textContent = current.caption;
  if (progress) progress.textContent = `Question ${state.l2QuestionIndex + 1} / ${l2EnergyQuestions.length}`;
  if (question) question.textContent = current.question;
  if (input) {
    input.value = '';
    input.disabled = false;
    input.focus();
  }
  if (submitBtn) submitBtn.disabled = false;
  if (feedback) {
    feedback.textContent = '';
    feedback.className = 'l1-feedback';
  }
  // Narrate the question
  if (current) narrator.speak(current.question, 400);
}

function checkL2Answer() {
  const current = l2EnergyQuestions[state.l2QuestionIndex];
  const input = document.getElementById('l2-answer-input');
  const feedback = document.getElementById('l2-feedback');
  const submitBtn = document.getElementById('l2-submit-btn');
  if (!current || !input || !feedback) return;

  const userAnswer = input.value.trim().toLowerCase();
  if (!userAnswer) {
    feedback.textContent = 'Please type your answer first.';
    feedback.className = 'l1-feedback bad';
    return;
  }

  const isCorrect = current.acceptedAnswers.some(a => a.toLowerCase() === userAnswer);

  if (isCorrect) {
    feedback.textContent = 'Correct! Loading next question...';
    feedback.className = 'l1-feedback good';
    // narrator.speak('Correct! Excellent!');
    input.disabled = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      burstStars(submitBtn);
    }

    setTimeout(() => {
      if (state.l2QuestionIndex < l2EnergyQuestions.length - 1) {
        state.l2QuestionIndex += 1;
        renderLevel2Question();
      } else {
        if (!state.completedLevels.has(2)) {
          state.completedLevels.add(2);
          updateMap();
        }
        showScreen('final');
      }
    }, 1000);
  } else {
    feedback.textContent = 'Not quite. Try again!';
    feedback.className = 'l1-feedback bad';
    narrator.speak('Not quite. Try again!');
  }
}

let currentQuizAnswered = false;

function openQuiz(level) {
  state.quizLevel = level;
  currentQuizAnswered = false;
  const q = quizData[level];

  const quizIcon = document.getElementById('quiz-icon');
  quizIcon.innerHTML = `<img src="${q.icon}" alt="Quiz Icon" style="width:60px; height:60px; object-fit:contain;">`;

  document.getElementById('quiz-question').textContent = q.question;

  const inputBox = document.getElementById('quiz-input');
  inputBox.value = '';
  inputBox.disabled = false;

  const fb = document.getElementById('quiz-feedback');
  fb.textContent = '';
  fb.className = 'quiz-feedback';

  document.getElementById('quiz-submit-btn').style.display = 'inline-flex';
  document.getElementById('quiz-next-btn').style.display = 'none';

  document.getElementById('quiz-overlay').classList.add('active');
}

function submitQuizAnswer() {
  const q = quizData[state.quizLevel];
  const userAnswer = document.getElementById('quiz-input').value.trim().toLowerCase();
  const correctAnswer = q.correctAnswer.toLowerCase();
  const fb = document.getElementById('quiz-feedback');

  if (userAnswer === correctAnswer) {
    fb.textContent = 'Amazing! You got it right!';
    fb.classList.add('good');

    const inputBox = document.getElementById('quiz-input');
    inputBox.disabled = true;
    document.getElementById('quiz-submit-btn').style.display = 'none';

    const levelCompleteOverlay = document.getElementById('level-complete-overlay');
    if (levelCompleteOverlay) {
      document.getElementById('quiz-overlay').classList.remove('active');
      levelCompleteOverlay.classList.add('active');
    }
  } else {
    fb.textContent = 'Not quite — try again!';
    fb.classList.add('bad');
  }
}

function nextQuizQuestion() {
  document.getElementById('quiz-overlay').classList.remove('active');
  document.getElementById('screen-map').classList.add('active');
}

function closeQuiz() {
  document.getElementById('quiz-overlay').classList.remove('active');
  const lv = state.quizLevel;
  if (!state.completedLevels.has(lv)) {
    state.completedLevels.add(lv);
    showLevelComplete(lv);
  } else {
    showScreen('map');
  }
}

/* ========================================================
   LEVEL COMPLETE
======================================================== */
const badges = {
  1: { title: 'Force Quiz Complete!', badge: 'Force Thinker Unlocked!' },
  2: { title: 'Energy Level Complete!', badge: 'Energy Explorer Unlocked!' }
};

function showLevelComplete(lv) {
  const d = badges[lv] || { title: 'Level Complete!', badge: '⭐ Badge Earned!' };
  document.getElementById('lc-title').textContent = d.title;
  document.getElementById('lc-badge').textContent = d.badge;
  document.getElementById('level-complete-overlay').classList.add('active');
  // Burst stars at screen center since we don't have a submit button reference here
  burstStarsCenter();
}

function closeLevelComplete() {
  document.getElementById('level-complete-overlay').classList.remove('active');
  updateMap();
  showScreen('map');
}

/* ========================================================
   FINAL CHALLENGE
======================================================== */
const scenarios = [
  { icon: '⚽', text: 'A boy is kicking a football hard across the field!', answer: 'muscular' },
  { icon: '🍎', text: 'An apple falls from the tree all the way to the ground!', answer: 'gravity' },
  { icon: '🚗', text: 'A car brakes and slows down on a bumpy road!', answer: 'friction' },
  { icon: '📌', text: 'A magnet pulls iron pins towards it across the table!', answer: 'magnetic' },
  { icon: '🏋️', text: 'A person lifts a heavy box and places it on a shelf!', answer: 'muscular' },
  { icon: '🌧️', text: 'Rain drops fall from the sky to the ground!', answer: 'gravity' }
];

function initChallenge() {
  state.challengeIndex = 0;
  state.challengeScore = 0;
  updateChallengeScenario();
}

function updateChallengeScenario() {
  if (state.challengeIndex >= scenarios.length) {
    setTimeout(() => showScreen('final'), 800);
    return;
  }
  const s = scenarios[state.challengeIndex];
  document.getElementById('scenario-icon').textContent = s.icon;
  document.getElementById('scenario-text').textContent = s.text;
  document.getElementById('challenge-fb').textContent = '';
  document.getElementById('challenge-score').textContent =
    `Score: ${state.challengeScore} / ${scenarios.length}`;

  document.querySelectorAll('.force-choice').forEach(b => b.disabled = false);
}

function checkForce(chosen) {
  const s = scenarios[state.challengeIndex];
  const fb = document.getElementById('challenge-fb');
  document.querySelectorAll('.force-choice').forEach(b => b.disabled = true);

  if (chosen === s.answer) {
    fb.textContent = '🎉 Correct! Well done!';
    fb.style.color = '#2e7d32';
    state.challengeScore++;
    burstStarsCenter();
  } else {
    const names = { muscular: 'Muscular', friction: 'Frictional', gravity: 'Gravitational', magnetic: 'Magnetic' };
    fb.textContent = `😊 Not quite! The answer is ${names[s.answer]} Force.`;
    fb.style.color = '#b71c1c';
  }

  state.challengeIndex++;
  document.getElementById('challenge-score').textContent =
    `Score: ${state.challengeScore} / ${scenarios.length}`;

  setTimeout(updateChallengeScenario, 1400);
}

/* ========================================================
   CELEBRATION
======================================================== */
function launchCelebration() {
  const wrap = document.getElementById('confetti-wrap');
  wrap.innerHTML = '';
  const colors = ['#ff4081', '#ffeb3b', '#00bcd4', '#69f0ae', '#ff5722', '#7c4dff', '#fff'];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    p.className = 'conf-piece';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = '-20px';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.borderRadius = Math.random() > .5 ? '50%' : '2px';
    p.style.animationDuration = (2 + Math.random() * 3) + 's';
    p.style.animationDelay = Math.random() * 3 + 's';
    p.style.width = p.style.height = (8 + Math.random() * 10) + 'px';
    p.style.opacity = '.85';
    wrap.appendChild(p);
  }
}

/* ========================================================
   STAR BURST EFFECTS
======================================================== */
function burstStars(el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  spawnStars(cx, cy);
}

function burstStarsCenter() {
  spawnStars(window.innerWidth / 2, window.innerHeight / 2);
}

function spawnStars(cx, cy) {
  const container = document.getElementById('stars-burst');

  const svgShapes = [
    `<svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.4 6.6 19.3l1-6.1-4.4-4.3 6.1-.9L12 2.5z"
          fill="#FFD54F" stroke="#222" stroke-width="1" stroke-linejoin="round"/>
      </svg>`,
    `<svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2z"
          fill="#FFF176" stroke="#222" stroke-width="1" stroke-linejoin="round"/>
      </svg>`,
    `<svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7" fill="#81D4FA" stroke="#222" stroke-width="1"/>
        <circle cx="12" cy="12" r="2.5" fill="#ffffff"/>
      </svg>`
  ];

  const particleCount = 16;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'star-p';
    particle.innerHTML = svgShapes[Math.floor(Math.random() * svgShapes.length)];

    const angle = (Math.PI * 2 / particleCount) * i;
    const distance = 140 + Math.random() * 140;

    particle.style.left = `${cx}px`;
    particle.style.top = `${cy}px`;
    particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);

    container.appendChild(particle);

    setTimeout(() => {
      particle.remove();
    }, 1400);
  }
}

/* ========================================================
   RESTART
======================================================== */
function restartGame() {
  state.completedLevels.clear();
  state.l1QuestionIndex = 0;
  state.l2QuestionIndex = 0;
  state.l2Done = false;
  state.l3TappedCount = 0;
  state.l3Tapped = new Set();
  state.l4MagnetUsed = false;
  state.challengeIndex = 0;
  state.challengeScore = 0;

  // Reset map cards
  for (let i = 2; i <= 2; i++) {
    const card = document.getElementById('map-' + i);
    if (card) {
      card.classList.add('locked');
      card.classList.remove('completed');

      const statusChip = card.querySelector('.map-status-chip');
      if (statusChip) {
        statusChip.textContent = 'LOCKED';
        statusChip.className = 'map-status-chip map-status-locked';
      }
      const actionDiv = card.querySelector('.map-card-action span:first-child');
      if (actionDiv) actionDiv.textContent = 'Complete Level 1';

      const lockArrow = card.querySelector('.map-arrow');
      if (lockArrow) lockArrow.textContent = '🔒';
    }
    const lock = document.getElementById('lock-' + i);
    if (lock) lock.style.display = 'block';
  }

  const finalTile = document.getElementById('map-final');
  if (finalTile) finalTile.remove();

  showScreen('start');
}
