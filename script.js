/**
 * NEURO-HEAL CORE LOGIC
 * Premium Mental Health Architecture using Vanilla JS & localStorage
 */

document.addEventListener('DOMContentLoaded', () => {

    // Block file:// protocol usage
    if (window.location.protocol === 'file:') {
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; height: 100vh; width: 100vw; background-color: #0f172a; color: white; justify-content: center; align-items: center; font-family: 'Outfit', sans-serif; text-align: center; padding: 20px;">
                <h1 style="font-size: 2.5rem; margin-bottom: 1rem; color: #ef4444;"><i class="fa-solid fa-server"></i> Server Required</h1>
                <p style="color: #94a3b8; font-size: 1.2rem; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                    Neuro-Heal requires the Node.js backend server to function properly. Opening the HTML file directly is not supported.
                    <br><br>
                    Please start the application by running <code style="background: #1e293b; padding: 5px 8px; border-radius: 5px; color: #38bdf8;">node server.js</code> in your terminal and navigating to <code style="background: #1e293b; padding: 5px 8px; border-radius: 5px; color: #38bdf8;">http://localhost:3000</code>.
                </p>
            </div>
        `;
        document.body.style.margin = '0';
        return;
    }

    /* =========================================================================
       0. PREFERENCES INITIALIZATION
       ========================================================================= */
    const savedTheme = localStorage.getItem('nh_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }

    /* =========================================================================
       1. CORE INITIALIZATION & NAVIGATION
       ========================================================================= */
    const splashScreen = document.getElementById('splash-screen');
    const mainContent = document.getElementById('main-content');

    // Splash Screen timeout — 3s to match animation
    setTimeout(() => {
        splashScreen.style.opacity = '0';
        setTimeout(() => {
            splashScreen.classList.add('hidden');
            mainContent.classList.remove('hidden');
            checkDailyCheckin();
            initChart();
        }, 1000);
    }, 3400);

    // Navigation Logic
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view-section');
    const sidebar = document.querySelector('.sidebar');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');

    function switchView(targetId) {
        // Hide all views
        views.forEach(v => {
            v.classList.remove('active');
            v.classList.add('hidden');
        });

        // Show target
        const targetView = document.getElementById(targetId);
        if (targetView) {
            targetView.classList.remove('hidden');
            // Trigger reflow for fade-in animation
            void targetView.offsetWidth;
            targetView.classList.add('active');
        }

        // Update Nav status
        navLinks.forEach(l => {
            if (l.getAttribute('data-target') === targetId) {
                l.classList.add('active');
            } else {
                l.classList.remove('active');
            }
        });

        // Close mobile menu if open
        if (window.innerWidth <= 900) {
            sidebar.classList.remove('active');
        }

        // Re-render chart if navigating to dashboard
        if (targetId === 'dashboard') {
            initChart();
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');
            if (target) switchView(target);
        });
    });

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    /* =========================================================================
       2. DAILY CHECK-IN
       ========================================================================= */
    const checkinModal = document.getElementById('daily-checkin-modal');
    const closeCheckinBtn = document.querySelector('.close-modal-btn');
    const moodBtns = document.querySelectorAll('.mood-btn');
    const checkinFeedback = document.getElementById('checkin-feedback');

    function checkDailyCheckin() {
        // Show mood options immediately on load as requested
        checkinModal.classList.remove('hidden');
    }

    closeCheckinBtn.addEventListener('click', () => {
        checkinModal.classList.add('hidden');
    });

    moodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mood = btn.getAttribute('data-mood');

            // Save to LocalStorage as a Journal Entry
            const entries = JSON.parse(localStorage.getItem('nh_journal')) || [];
            entries.unshift({
                id: Date.now(),
                title: 'Daily Check-in',
                content: `Logged mood via Daily Check-in: ${mood}.`,
                mood: mapMoodToGeneral(mood),
                date: new Date().toLocaleString()
            });
            localStorage.setItem('nh_journal', JSON.stringify(entries));
            localStorage.setItem('nh_last_checkin', new Date().toDateString());

            // Track mood score for Chart
            saveMoodScore(mood);

            // Show Feedback
            btn.parentElement.classList.add('hidden');
            checkinFeedback.classList.remove('hidden');
            renderJournalEntries();
            renderDashboardLogs();
            generateSelfCarePlan(mood);

            // Auto-redirect to dashboard with AI insights and mood logs
            setTimeout(() => {
                checkinModal.classList.add('hidden');
                btn.parentElement.classList.remove('hidden');
                checkinFeedback.classList.add('hidden');

                // Trigger dashboard view
                const dashLink = document.querySelector('.nav-link[data-target="dashboard"]');
                if (dashLink) dashLink.click();
            }, 800);
        });
    });

    function mapMoodToGeneral(mood) {
        if (mood === 'excellent') return 'happy';
        if (mood === 'good') return 'happy';
        if (mood === 'average') return 'calm';
        if (mood === 'bad') return 'sad';
        if (mood === 'terrible') return 'anxious';
        return 'calm';
    }

    function saveMoodScore(mood) {
        let score = 5;
        if (mood === 'excellent') score = 9;
        if (mood === 'good') score = 7;
        if (mood === 'average') score = 5;
        if (mood === 'bad') score = 3;
        if (mood === 'terrible') score = 1;

        const scores = JSON.parse(localStorage.getItem('nh_mood_scores')) || [5, 6, 5, 4, 6, 7]; // dummy default
        scores.push(score);
        if (scores.length > 7) scores.shift(); // Keep last 7 days
        localStorage.setItem('nh_mood_scores', JSON.stringify(scores));
    }


    /* =========================================================================
       3. AI INSIGHTS & MOOD CHART (Chart.js)
       ========================================================================= */
    let moodChartInstance = null;

    function initChart() {
        const canvas = document.getElementById('moodChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const scores = JSON.parse(localStorage.getItem('nh_mood_scores')) || [5, 6, 5, 4, 6, 7, 8];
        const labels = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Today'];

        if (moodChartInstance) {
            moodChartInstance.destroy();
        }
        const isDark = document.body.classList.contains('dark-theme');
        Chart.defaults.color = isDark ? '#94A3B8' : '#64748B';
        Chart.defaults.font.family = "'DM Sans', sans-serif";

        // Create Gradient
        let gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, isDark ? 'rgba(32, 227, 178, 0.4)' : 'rgba(52, 211, 153, 0.4)');
        gradient.addColorStop(1, isDark ? 'rgba(12, 235, 235, 0.05)' : 'rgba(14, 165, 233, 0.05)');

        moodChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.slice(-scores.length),
                datasets: [{
                    label: 'Mood Score',
                    data: scores,
                    borderColor: isDark ? '#20e3b2' : '#14B8A6',
                    borderWidth: 3,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: isDark ? '#050505' : '#FFFFFF',
                    pointBorderColor: isDark ? '#0cebeb' : '#14B8A6',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? 'rgba(10, 10, 10, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        titleColor: isDark ? '#FFFFFF' : '#1E293B',
                        bodyColor: isDark ? '#A1A1AA' : '#64748B',
                        borderColor: isDark ? 'rgba(32, 227, 178, 0.3)' : 'rgba(148, 163, 184, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        cornerRadius: 10
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(148, 163, 184, 0.1)' },
                        ticks: { stepSize: 2 }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    /* =========================================================================
       3.5 DOWNLOAD REPORT
       ========================================================================= */
    const downloadReportBtn = document.getElementById('download-report-btn');
    if (downloadReportBtn) {
        downloadReportBtn.addEventListener('click', () => {
            const dashboardElement = document.getElementById('dashboard');
            if (!dashboardElement) return;

            // Change button icon to indicate loading
            const icon = downloadReportBtn.querySelector('i');
            const originalClass = icon.className;
            icon.className = 'fa-solid fa-spinner fa-spin';

            const opt = {
                margin: [10, 10, 10, 10],
                filename: 'Neuro-Heal-Insights-Report.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: document.body.classList.contains('dark-theme') ? '#0f172a' : '#f0f4f8' },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(dashboardElement).save().then(() => {
                // Restore icon
                icon.className = originalClass;
            }).catch(err => {
                console.error("PDF generation failed:", err);
                icon.className = originalClass;
                alert("Failed to generate PDF. Please try again.");
            });
        });
    }

    /* =========================================================================
       4. EMOTION JOURNAL
       ========================================================================= */
    const saveJournalBtn = document.getElementById('save-journal-btn');
    const journalTitle = document.getElementById('journal-title');
    const journalContent = document.getElementById('journal-content');
    const journalMood = document.getElementById('journal-mood-tag');
    const journalList = document.getElementById('journal-entries-list');

    function renderJournalEntries() {
        const entries = JSON.parse(localStorage.getItem('nh_journal')) || [];

        if (entries.length === 0) {
            journalList.innerHTML = `<div class="empty-state">
                <i class="fa-solid fa-book-open"></i>
                <p>No entries yet. Start writing to see them here.</p>
            </div>`;
            return;
        }

        journalList.innerHTML = entries.map(entry => `
            <div class="journal-entry-card">
                <h4>${escapeHTML(entry.title)}</h4>
                <div class="meta">
                    <span style="color: var(--accent-purple); text-transform: capitalize;">${entry.mood}</span> • ${entry.date}
                </div>
                <p>${escapeHTML(entry.content)}</p>
            </div>
        `).join('');
    }

    function renderDashboardLogs() {
        const dashboardLogs = document.getElementById('dashboard-recent-logs');
        if (!dashboardLogs) return;

        const entries = JSON.parse(localStorage.getItem('nh_journal')) || [];

        if (entries.length === 0) {
            dashboardLogs.innerHTML = `<div class="empty-state">
                <i class="fa-solid fa-book-open"></i>
                <p>No entries yet.</p>
            </div>`;
            return;
        }

        dashboardLogs.innerHTML = entries.slice(0, 5).map(entry => `
            <div class="journal-entry-card" style="margin-bottom: 10px; background: rgba(255,255,255,0.5);">
                <div style="display: flex; justify-content: space-between;">
                    <h4 style="margin: 0; font-size: 1rem;">${escapeHTML(entry.title)}</h4>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${entry.date}</span>
                </div>
                <div class="meta" style="margin: 5px 0;">
                    <span style="color: var(--accent-purple); text-transform: capitalize; font-weight: 600;">${entry.mood}</span>
                </div>
                <p style="margin: 0; font-size: 0.9rem;">${escapeHTML(entry.content)}</p>
            </div>
        `).join('');
    }

    if (saveJournalBtn) {
        saveJournalBtn.addEventListener('click', () => {
            const title = journalTitle.value.trim() || 'Untitled Entry';
            const content = journalContent.value.trim();
            const mood = journalMood.value;

            if (!content) {
                alert("Please write something before saving.");
                return;
            }

            const entries = JSON.parse(localStorage.getItem('nh_journal')) || [];
            entries.unshift({
                id: Date.now(),
                title,
                content,
                mood,
                date: new Date().toLocaleString()
            });

            localStorage.setItem('nh_journal', JSON.stringify(entries));
            journalTitle.value = '';
            journalContent.value = '';

            renderJournalEntries();
            renderDashboardLogs();
            alert("Entry Saved Safely!");

            // Generate care plan based on logged negative emotions
            if (mood === 'sad' || mood === 'anxious' || mood === 'angry') {
                generateSelfCarePlan(mood);
            }
        });
    }

    // Clear Logs functionality
    const clearLogsBtns = document.querySelectorAll('.clear-logs-btn');
    clearLogsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm("Are you sure you want to clear all your mood entries and logs? This cannot be undone.")) {
                localStorage.removeItem('nh_journal');
                renderJournalEntries();
                renderDashboardLogs();
            }
        });
    });

    // Initial render
    renderJournalEntries();
    renderDashboardLogs();

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    /* =========================================================================
       5. PERSONALIZED SELF-CARE PLAN
       ========================================================================= */
    const carePlanGrid = document.getElementById('care-plan-grid');

    function generateSelfCarePlan(trigger, score = null) {
        let activities = [];

        if (trigger === 'assessment') {
            if (score >= 8) {
                activities.push({ icon: 'fa-user-group', title: 'Connect Offline', desc: 'Reach out to a close friend or family member just to hear their voice.' });
                activities.push({ icon: 'fa-anchor', title: '5-4-3-2-1 Grounding', desc: 'Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, and 1 you taste.' });
            } else if (score >= 4) {
                activities.push({ icon: 'fa-lungs', title: 'Box Breathing', desc: 'Inhale for 4s, hold for 4s, exhale for 4s, hold for 4s. Repeat.' });
                activities.push({ icon: 'fa-pen-nib', title: 'Brain Dump', desc: 'Write down everything bothering you on paper, then rip it up.' });
            } else {
                activities.push({ icon: 'fa-person-walking', title: '15 Min Mindful Walk', desc: 'Take a brief walk outside. Focus on the sounds and sights around you.' });
                activities.push({ icon: 'fa-bed-pulse', title: 'Sleep Hygiene Review', desc: 'Ensure your room is dark and cool. No screens 1 hour before bed.' });
            }
        } else {
            // Journal triggers
            if (trigger === 'anxious' || trigger === 'stressed') {
                activities.push({ icon: 'fa-lungs', title: '4-7-8 Breathing', desc: 'Inhale for 4s, hold for 7s, exhale for 8s. Great for immediate calm.' });
                activities.push({ icon: 'fa-headphones', title: 'Guided Meditation', desc: 'Listen to a 10-minute progressive muscle relaxation audio.' });
            } else if (trigger === 'sad') {
                activities.push({ icon: 'fa-sun', title: 'Light Exposure', desc: 'Spend 20 minutes in direct sunlight to help boost serotonin.' });
                activities.push({ icon: 'fa-face-smile', title: 'Gratitude List', desc: 'Write down 3 tiny things that went well today.' });
            } else if (trigger === 'angry') {
                activities.push({ icon: 'fa-person-running', title: 'Physical Release', desc: 'Do 10 minutes of intense cardio to burn off adrenaline.' });
                activities.push({ icon: 'fa-droplet', title: 'Cold Water Splash', desc: 'Splash cold water on your face.' });
            } else {
                activities.push({ icon: 'fa-seedling', title: 'Maintain Momentum', desc: 'Reflect on what made today good and write it down.' });
                activities.push({ icon: 'fa-book-open', title: 'Read a Chapter', desc: 'Read a chapter of a book you enjoy to wind down.' });
            }
        }

        if (carePlanGrid) {
            carePlanGrid.innerHTML = activities.map(act => `
                <div class="task-card">
                    <div class="task-header">
                        <div class="task-icon"><i class="fa-solid ${act.icon}"></i></div>
                        <h4>${act.title}</h4>
                    </div>
                    <p>${act.desc}</p>
                    <button class="btn outline-btn btn-small w-100"><i class="fa-solid fa-check"></i> Mark Complete</button>
                </div>
            `).join('');
        }
    }

    // Initial generation
    generateSelfCarePlan('general');


    /* =========================================================================
       6. SMART THERAPIST MATCH
       ========================================================================= */
    const quizSteps = document.querySelectorAll('.quiz-step');
    const matchOptions = document.querySelectorAll('.match-option');
    const matchResult = document.getElementById('match-result');
    let userTags = [];

    matchOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            const stepNum = parseInt(opt.closest('.quiz-step').getAttribute('data-step'));
            userTags.push(opt.getAttribute('data-tag'));

            // Hide current step
            quizSteps[stepNum - 1].classList.add('hidden');
            quizSteps[stepNum - 1].classList.remove('active');

            if (stepNum < quizSteps.length) {
                // Show next step
                quizSteps[stepNum].classList.remove('hidden');
                quizSteps[stepNum].classList.add('active');
            } else {
                // Determine Result
                showTherapistMatchResult(userTags);
            }
        });
    });

    function showTherapistMatchResult(tags) {
        matchResult.classList.remove('hidden');

        let targetDoc = doctors[0]; // Default

        if (tags.includes('cbt') || tags.includes('anxiety')) {
            targetDoc = doctors.find(d => d.style === 'CBT Specialist') || doctors[0];
        } else if (tags.includes('psych') || tags.includes('depression')) {
            targetDoc = doctors.find(d => d.style === 'Psychiatrist') || doctors[1];
        }

        setTimeout(() => {
            matchResult.innerHTML = `
                <div class="recommended-doctor fade-in">
                    <i class="fa-solid fa-medal" style="font-size: 3rem; color: var(--success); margin-bottom: 15px;"></i>
                    <h3 style="color: var(--text-main);">Perfect Match Found</h3>
                    <p>Based on your preferences, we highly recommend:</p>
                    
                    <div class="doc-card" style="margin: 20px auto; max-width: 400px; text-align: left; background: var(--bg-base);">
                        <div class="doc-avatar-lg"><i class="fa-solid fa-user-doctor"></i></div>
                        <div>
                            <h4>${targetDoc.name}</h4>
                            <p style="font-size: 0.85rem; color: var(--text-muted);">${targetDoc.style}</p>
                            <span style="color: var(--warning); font-size: 0.85rem;"><i class="fa-solid fa-star"></i> ${targetDoc.rating}</span>
                        </div>
                    </div>
                    
                    <button class="btn primary-btn nav-link" data-target="checker" onclick="setTimeout(()=>document.getElementById('b-name').focus(),500)">
                        Book Session with ${targetDoc.name.split(' ')[1]}
                    </button>
                    <button class="btn outline-btn mt-3" onclick="location.reload()">Reset Quiz</button>
                </div>
            `;

            // Re-attach nav-link logic for newly injected button
            matchResult.querySelector('.nav-link').addEventListener('click', (e) => {
                e.preventDefault();
                switchView(e.currentTarget.getAttribute('data-target'));
                if (e.currentTarget.onclick) e.currentTarget.onclick();
            });

        }, 1500);
    }


    /* =========================================================================
       7. CONSULT A DOCTOR (ANONYMOUS OPTION)
       ========================================================================= */
    const doctors = [
        { name: "Dr. Sarah Mitchell", style: "Clinical Psychologist", rating: "4.9 (120 reviews)" },
        { name: "Dr. James Wilson", style: "Psychiatrist", rating: "4.8 (85 reviews)" },
        { name: "Dr. Emily Chen", style: "CBT Specialist", rating: "5.0 (214 reviews)" }
    ];

    const doctorListDiv = document.getElementById('doctor-list');
    if (doctorListDiv) {
        doctorListDiv.innerHTML = doctors.map((doc, i) => `
            <div class="doc-card" style="cursor: pointer;" data-index="${i}">
                <div class="doc-avatar-lg"><i class="fa-solid fa-user-doctor"></i></div>
                <div>
                    <h4>${doc.name}</h4>
                    <p style="font-size: 0.85rem; color: var(--text-muted);">${doc.style}</p>
                    <span style="color: var(--warning); font-size: 0.85rem;"><i class="fa-solid fa-star"></i> ${doc.rating}</span>
                </div>
            </div>
        `).join('');

        // Select Doctor Logic
        const docCards = document.querySelectorAll('.doc-card');
        docCards.forEach(card => {
            card.addEventListener('click', () => {
                docCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            });
        });
    }

    const anonToggle = document.getElementById('anon-toggle');
    const stdFields = document.getElementById('standard-fields');
    const anonFields = document.getElementById('anonymous-fields');
    const bName = document.getElementById('b-name');
    const bEmail = document.getElementById('b-email');

    if (anonToggle) {
        anonToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                stdFields.classList.add('hidden');
                anonFields.classList.remove('hidden');
                bName.removeAttribute('required');
                bEmail.removeAttribute('required');
            } else {
                stdFields.classList.remove('hidden');
                anonFields.classList.add('hidden');
                bName.setAttribute('required', 'true');
                bEmail.setAttribute('required', 'true');
            }
        });
    }

    const bookingForm = document.getElementById('booking-form');
    const bookingSuccess = document.getElementById('booking-success');

    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            bookingForm.classList.add('hidden');
            document.querySelector('.anonymous-toggle').classList.add('hidden');
            bookingSuccess.classList.remove('hidden');
        });
    }

    /* =========================================================================
       8. COMMUNITY SPACE
       ========================================================================= */
    const feedContainer = document.getElementById('community-feed');
    const submitPostBtn = document.getElementById('submit-post-btn');
    const newPostContent = document.getElementById('new-post-content');

    const dummyPosts = [
        { c: "Today I finally managed to get out of bed and take a short walk. It feels like a small win, but I'm proud of myself.", time: "2 hours ago", likes: 42 },
        { c: "Does anyone else feel completely exhausted after social interactions? I started a new job and the masking is draining.", time: "5 hours ago", likes: 128 },
        { c: "Reminder: Healing is not linear. You are allowed to have bad days.", time: "1 day ago", likes: 350 }
    ];

    function renderFeed() {
        if (!feedContainer) return;
        feedContainer.innerHTML = dummyPosts.map(p => `
            <div class="feed-post fade-in">
                <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 15px;">
                    <div class="avatar" style="width: 35px; height: 35px; background: rgba(99,102,241,0.1); color: #6366f1; border-radius: 50%; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-mask"></i></div>
                    <div>
                        <strong style="font-size: 0.95rem;">Anonymous Member</strong>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${p.time}</div>
                    </div>
                </div>
                <p style="font-size: 1.05rem; line-height: 1.5;">${escapeHTML(p.c)}</p>
                <div class="post-actions">
                    <span><i class="fa-regular fa-heart"></i> ${p.likes}</span>
                    <span><i class="fa-regular fa-comment"></i> Support</span>
                </div>
            </div>
        `).join('');
    }

    renderFeed();

    if (submitPostBtn) {
        submitPostBtn.addEventListener('click', () => {
            const content = newPostContent.value.trim();
            if (!content) return;

            dummyPosts.unshift({
                c: content,
                time: "Just now",
                likes: 0
            });

            newPostContent.value = '';
            renderFeed();
            alert("Your anonymous post is now live.");
        });
    }

    /* =========================================================================
       9. WELLNESS-CHECK (Mental Health Only)
       ========================================================================= */
    const mhQuestions = [
        "Over the last 2 weeks, how often have you felt nervous, anxious, or on edge?",
        "How often have you not been able to stop or control worrying?",
        "How often have you had trouble falling or staying asleep, or sleeping too much?",
        "How often have you felt bad about yourself, or that you are a failure?"
    ];

    let currentQ = 0;
    let totalScore = 0;

    const assessmentQText = document.getElementById('question-text');
    const assessmentBtns = document.querySelectorAll('.checker-btn');
    const quizArea = document.getElementById('checker-quiz-area');
    const resultArea = document.getElementById('checker-result-area');
    const assessProgressBar = document.querySelector('.progress-bar');
    const resultDesc = document.getElementById('result-desc');
    const resultTitleTxt = document.getElementById('result-title');

    function updateQuestion() {
        if (currentQ < mhQuestions.length) {
            assessmentQText.innerText = mhQuestions[currentQ];
            assessProgressBar.style.width = `${((currentQ) / mhQuestions.length) * 100}%`;
        } else {
            showAssessmentResult();
        }
    }

    if (assessmentBtns.length > 0) {
        assessmentBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                totalScore += parseInt(btn.getAttribute('data-score'));
                currentQ++;
                updateQuestion();
            });
        });
    }

    const showSelfCareBtn = document.getElementById('show-self-care-btn');
    const showConsultBtn = document.getElementById('show-consult-btn');
    const checkerSelfCareSection = document.getElementById('checker-self-care-section');
    const checkerConsultSection = document.getElementById('checker-consult-section');

    if (showSelfCareBtn && showConsultBtn) {
        showSelfCareBtn.addEventListener('click', () => {
            checkerSelfCareSection.classList.remove('hidden');
            checkerConsultSection.classList.add('hidden');
        });

        showConsultBtn.addEventListener('click', () => {
            checkerConsultSection.classList.remove('hidden');
            checkerSelfCareSection.classList.add('hidden');
        });
    }

    function showAssessmentResult() {
        quizArea.classList.add('hidden');
        resultArea.classList.remove('hidden');

        if (checkerSelfCareSection) checkerSelfCareSection.classList.add('hidden');
        if (checkerConsultSection) checkerConsultSection.classList.add('hidden');

        // Very basic simple scoring
        if (totalScore >= 8) {
            resultTitleTxt.innerText = "High Distress Level";
            resultDesc.innerText = "Your answers indicate significant emotional strain. Please utilize the Consultation form below to speak with a professional safely.";
        } else if (totalScore >= 4) {
            resultTitleTxt.innerText = "Moderate Distress Level";
            resultDesc.innerText = "You are experiencing some strain. Review your personalized Self-Care plan below and try keeping track of your moods in the Emotion Journal.";
        } else {
            resultTitleTxt.innerText = "Mild/No Distress";
            resultDesc.innerText = "You seem to be managing well. Review your self-care practices below to maintain your wellbeing.";
        }

        generateSelfCarePlan('assessment', totalScore);
    }

    /* =========================================================================
       10. AI CHATBOT — NEURA (Gemini-Powered via Node.js Backend)
       ========================================================================= */
    const chatFab = document.getElementById('chat-fab');
    const chatPanel = document.getElementById('chat-panel');
    const chatCloseBtn = document.getElementById('chat-close-btn');
    const chatClearBtn = document.getElementById('chat-clear-btn');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatTyping = document.getElementById('chat-typing');
    const chatBadge = document.getElementById('chat-badge');
    const chatBackdrop = document.getElementById('chat-backdrop');

    // Conversation history (multi-turn)
    let chatHistory = [];
    let chatIsOpen = false;
    let chatHasUnread = false;

    // ── Quick-start prompts shown in the welcome screen ──────────────────
    const QUICK_PROMPTS = [
        "I'm feeling anxious today 😟",
        "Help me with a breathing exercise",
        "I'm stressed about work",
        "Give me a grounding technique",
        "I'm having trouble sleeping"
    ];

    // ── Helpers ───────────────────────────────────────────────────────────
    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function setTyping(show) {
        chatTyping.classList.toggle('hidden', !show);
        chatSendBtn.disabled = show;
        scrollToBottom();
    }

    // ── Render welcome / empty state ─────────────────────────────────────
    function renderWelcome() {
        chatMessages.innerHTML = `
            <div class="chat-welcome">
                <div class="chat-welcome-icon">
                    <i class="fa-solid fa-robot"></i>
                </div>
                <h5>Hi, I'm Neura 👋</h5>
                <p>Your AI mental health companion. I'm here to listen, support, and offer evidence-based strategies. What's on your mind?</p>
                <div class="chat-chips">
                    ${QUICK_PROMPTS.map(p => `<button class="chat-chip" data-prompt="${p}">${p}</button>`).join('')}
                </div>
            </div>
        `;

        // Attach click handlers to chips
        chatMessages.querySelectorAll('.chat-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const prompt = chip.getAttribute('data-prompt');
                sendChatMessage(prompt);
            });
        });
    }

    // ── Append a message bubble ──────────────────────────────────────────
    function appendMessage(role, text, isError = false) {
        // Remove welcome screen on first real message
        const welcome = chatMessages.querySelector('.chat-welcome');
        if (welcome) welcome.remove();

        const row = document.createElement('div');
        row.classList.add('msg-row', role === 'user' ? 'msg-user' : 'msg-ai');
        if (isError) row.classList.add('msg-error');

        const time = formatTime(new Date());

        if (role === 'assistant') {
            const parsedText = DOMPurify.sanitize(marked.parse(text));
            row.innerHTML = `
                <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
                <div>
                    <div class="msg-bubble markdown-body">${parsedText}</div>
                    <span class="msg-time">${time}</span>
                </div>
            `;
        } else {
            row.innerHTML = `
                <div>
                    <div class="msg-bubble">${escapeHTML(text)}</div>
                    <span class="msg-time">${time}</span>
                </div>
            `;
        }

        chatMessages.appendChild(row);
        scrollToBottom();
    }

    // ── Send a message to the backend ────────────────────────────────────
    async function sendChatMessage(userText) {
        const text = (userText || chatInput.value).trim();
        if (!text || chatSendBtn.disabled) return;

        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Add to UI & history
        appendMessage('user', text);
        chatHistory.push({ role: 'user', content: text });

        setTyping(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: chatHistory })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Something went wrong.');
            }

            const reply = data.reply;
            chatHistory.push({ role: 'assistant', content: reply });

            setTyping(false);
            appendMessage('assistant', reply);

            // Badge if panel is closed
            if (!chatIsOpen) {
                chatHasUnread = true;
                chatBadge.classList.remove('hidden');
            }

        } catch (err) {
            setTyping(false);
            appendMessage('assistant', `⚠️ ${err.message || 'Could not reach Neura. Make sure the server is running.'}`, true);
        }
    }

    // ── Open / Close panel ────────────────────────────────────────────────
    function openChat() {
        chatIsOpen = true;
        chatPanel.classList.add('chat-open');
        chatPanel.setAttribute('aria-hidden', 'false');
        chatBackdrop.classList.remove('hidden');
        chatBadge.classList.add('hidden');
        chatHasUnread = false;

        // Render welcome on first open
        if (chatMessages.children.length === 0) {
            renderWelcome();
        }

        setTimeout(() => chatInput.focus(), 300);
    }

    function closeChat() {
        chatIsOpen = false;
        chatPanel.classList.remove('chat-open');
        chatPanel.setAttribute('aria-hidden', 'true');
        chatBackdrop.classList.add('hidden');
    }

    // ── Event Listeners ───────────────────────────────────────────────────
    chatFab.addEventListener('click', () => {
        chatIsOpen ? closeChat() : openChat();
    });

    chatCloseBtn.addEventListener('click', closeChat);
    chatBackdrop.addEventListener('click', closeChat);

    chatClearBtn.addEventListener('click', () => {
        if (chatHistory.length === 0) return;
        if (!confirm('Clear the conversation history?')) return;
        chatHistory = [];
        renderWelcome();
    });

    chatSendBtn.addEventListener('click', () => sendChatMessage());

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });

    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });

    /* =========================================================================
       11. SETTINGS & PREFERENCES
       ========================================================================= */
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const factoryResetBtn = document.getElementById('factory-reset-btn');

    if (darkModeToggle) {
        // Sync toggle button state
        darkModeToggle.checked = document.body.classList.contains('dark-theme');

        darkModeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('dark-theme');
                localStorage.setItem('nh_theme', 'dark');
            } else {
                document.body.classList.remove('dark-theme');
                localStorage.setItem('nh_theme', 'light');
            }
            initChart(); // Re-render chart with new colors
        });
    }

    if (factoryResetBtn) {
        factoryResetBtn.addEventListener('click', () => {
            if (confirm("Are you sure? This will delete all journal entries, mood scores, and chat history. This cannot be undone.")) {
                localStorage.removeItem('nh_mood_scores');
                localStorage.removeItem('nh_journal_entries');
                localStorage.removeItem('nh_chat_history');
                alert("App data has been factory reset.");
                window.location.reload();
            }
        });
    }

    /* =========================================================================
       12. RELAX ZONE: BREATHING SYNC & BUBBLE TAP
       ========================================================================= */

    // Web Audio API context for calm sounds
    let audioCtx = null;
    function playCalmPop() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'sine';
        // Gentle "pop" frequency envelope
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);

        // Soft volume envelope
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
    }

    // Breathing Sync Game
    const breathingCircle = document.getElementById('breathing-circle');
    const breathingText = document.getElementById('breathing-text');
    const btnInhale = document.getElementById('btn-inhale');
    const btnExhale = document.getElementById('btn-exhale');
    const breathingScoreEl = document.getElementById('breathing-score');
    const breathingFeedback = document.getElementById('breathing-feedback');
    const breathingHighScoreEl = document.getElementById('breathing-high-score');
    const btnRestartBreathing = document.getElementById('btn-restart-breathing');

    let breathingScore = 0;
    let breathingHighScore = parseInt(localStorage.getItem('nh_breathing_high_score')) || 0;
    if (breathingHighScoreEl) breathingHighScoreEl.innerText = breathingHighScore;

    let expectedPhase = null; // 'inhale' or 'exhale'
    let breathingInterval;
    let breathTimer;
    let phaseActive = false; // To prevent multiple clicks per phase

    function resetBreathing() {
        clearInterval(breathingInterval);
        clearTimeout(breathTimer);
        expectedPhase = null;
        breathingCircle.className = 'breathing-circle';
        breathingText.innerText = 'Ready';
        breathingScore = 0;
        if (breathingScoreEl) breathingScoreEl.innerText = breathingScore;
    }

    function startBreathingCycle() {
        // Init state
        expectedPhase = 'inhale';
        phaseActive = true;
        breathingCircle.className = 'breathing-circle inhale';
        breathingText.innerText = 'Inhale...';

        breathingInterval = setInterval(() => {
            if (expectedPhase === 'inhale') {
                expectedPhase = 'exhale';
                phaseActive = true;
                breathingCircle.className = 'breathing-circle exhale';
                breathingText.innerText = 'Exhale...';
            } else {
                expectedPhase = 'inhale';
                phaseActive = true;
                breathingCircle.className = 'breathing-circle inhale';
                breathingText.innerText = 'Inhale...';
            }
        }, 4000); // 4 seconds per phase
    }

    if (btnInhale && btnExhale) {
        // Start cycle on first click if not running
        const handleBreathClick = (action) => {
            if (!expectedPhase) {
                startBreathingCycle();
                if (action !== 'inhale') { // User should start by clicking inhale
                    scoreBreathing(false);
                } else {
                    scoreBreathing(true);
                }
                return;
            }

            if (!phaseActive) return; // User already clicked for this phase

            if (action === expectedPhase) {
                scoreBreathing(true);
            } else {
                scoreBreathing(false);
            }
        };

        btnInhale.addEventListener('click', () => handleBreathClick('inhale'));
        btnExhale.addEventListener('click', () => handleBreathClick('exhale'));
    }

    function scoreBreathing(success) {
        phaseActive = false; // Lock out further clicks until next phase
        if (success) {
            breathingScore += 10;
            breathingScoreEl.innerText = breathingScore;

            if (breathingScore > breathingHighScore) {
                breathingHighScore = breathingScore;
                localStorage.setItem('nh_breathing_high_score', breathingHighScore);
                if (breathingHighScoreEl) breathingHighScoreEl.innerText = breathingHighScore;
            }

            breathingFeedback.innerText = "Perfect timing!";
            breathingFeedback.className = "game-feedback success";
        } else {
            breathingScore = 0;
            breathingScoreEl.innerText = breathingScore;
            breathingFeedback.innerText = "Sync lost. Score reset.";
            breathingFeedback.className = "game-feedback error";

            // visually reset circle
            breathingCircle.classList.add('error');
            setTimeout(() => {
                breathingCircle.classList.remove('error');
                resetBreathing();
            }, 1000);
            return;
        }

        clearTimeout(breathTimer);
        breathTimer = setTimeout(() => {
            breathingFeedback.innerText = "";
        }, 2000);
    }

    if (btnRestartBreathing) {
        btnRestartBreathing.addEventListener('click', () => {
            resetBreathing();
            breathingFeedback.innerText = "Sync restarted.";
            breathingFeedback.className = "game-feedback text-muted";
            setTimeout(() => { breathingFeedback.innerText = ""; }, 2000);
        });
    }


    // Bubble Tap Game
    const bubbleContainer = document.getElementById('bubble-container');
    const bubbleScoreEl = document.getElementById('bubble-score');
    const bubbleHighScoreEl = document.getElementById('bubble-high-score');
    const btnRestartBubble = document.getElementById('btn-restart-bubble');

    let bubbleScore = 0;
    let bubbleHighScore = parseInt(localStorage.getItem('nh_bubble_high_score')) || 0;
    if (bubbleHighScoreEl) bubbleHighScoreEl.innerText = bubbleHighScore;

    let bubbleInterval;

    function spawnBubble() {
        if (!bubbleContainer || bubbleContainer.closest('.hidden')) return; // Don't spawn if hidden

        const bubble = document.createElement('div');
        const size = Math.random() * 40 + 30; // 30px to 70px
        const left = Math.random() * 90; // 0% to 90%
        const colorClass = `bubble-color-${Math.floor(Math.random() * 4) + 1}`;
        const duration = Math.random() * 4 + 6; // 6s to 10s float time

        bubble.className = `bubble ${colorClass}`;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${left}%`;
        bubble.style.animationDuration = `${duration}s`;

        bubble.addEventListener('click', (e) => {
            playCalmPop();

            // Ripple effect
            const ripple = document.createElement('div');
            ripple.className = 'ripple-effect';
            ripple.style.width = `${size * 1.5}px`;
            ripple.style.height = `${size * 1.5}px`;
            ripple.style.left = `${bubble.offsetLeft - (size * 0.25)}px`;
            ripple.style.top = `${bubble.offsetTop - (size * 0.25)}px`;
            bubbleContainer.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);

            bubbleScore += 1;
            if (bubbleScoreEl) bubbleScoreEl.innerText = bubbleScore;

            if (bubbleScore > bubbleHighScore) {
                bubbleHighScore = bubbleScore;
                localStorage.setItem('nh_bubble_high_score', bubbleHighScore);
                if (bubbleHighScoreEl) bubbleHighScoreEl.innerText = bubbleHighScore;
            }

            bubble.remove();
        });

        // Cleanup
        setTimeout(() => {
            if (bubble.parentElement) bubble.remove();
        }, duration * 1000);

        bubbleContainer.appendChild(bubble);
    }

    if (btnRestartBubble) {
        btnRestartBubble.addEventListener('click', () => {
            bubbleScore = 0;
            if (bubbleScoreEl) bubbleScoreEl.innerText = bubbleScore;
            const bubbles = document.querySelectorAll('.bubble');
            bubbles.forEach(b => b.remove());
        });
    }

    // Relax Zone Navigation & Logic
    const relaxSelection = document.getElementById('relax-selection');
    const relaxGameArea = document.getElementById('relax-game-area');
    const gameBreathing = document.getElementById('game-breathing');
    const gameBubble = document.getElementById('game-bubble');
    const backToRelaxBtn = document.getElementById('back-to-relax-btn');
    const gameSelectBtns = document.querySelectorAll('.game-select-btn');

    function hideAllRelaxGames() {
        if (gameBreathing) gameBreathing.classList.add('hidden');
        if (gameBubble) gameBubble.classList.add('hidden');
        clearInterval(bubbleInterval);
        bubbleInterval = null;
        resetBreathing();
    }

    if (gameSelectBtns.length > 0) {
        gameSelectBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetGame = btn.getAttribute('data-game');

                if (relaxSelection) relaxSelection.classList.add('hidden');
                if (relaxGameArea) relaxGameArea.classList.remove('hidden');
                hideAllRelaxGames(); // Ensure clean state

                if (targetGame === 'breathing' && gameBreathing) {
                    gameBreathing.classList.remove('hidden');
                    resetBreathing(); // initialize
                } else if (targetGame === 'bubble' && gameBubble) {
                    gameBubble.classList.remove('hidden');
                    if (!bubbleInterval) {
                        bubbleInterval = setInterval(spawnBubble, 1200);
                    }
                }
            });
        });
    }

    if (backToRelaxBtn) {
        backToRelaxBtn.addEventListener('click', () => {
            hideAllRelaxGames();
            if (relaxGameArea) relaxGameArea.classList.add('hidden');
            if (relaxSelection) relaxSelection.classList.remove('hidden');
        });
    }

    // Cleanup resources if leaving view (from main navigation)
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const target = link.getAttribute('data-target');
            if (target !== 'relax') {
                hideAllRelaxGames();
                // Reset to selection screen when returning
                if (relaxSelection && relaxGameArea) {
                    relaxGameArea.classList.add('hidden');
                    relaxSelection.classList.remove('hidden');
                }
            }
        });
    });

});
