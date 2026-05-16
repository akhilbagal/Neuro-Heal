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

