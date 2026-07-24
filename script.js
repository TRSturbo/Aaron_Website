        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        // Experience data
        const experiences = [
            {
                company: "Acuity Brands",
                title: "Senior Manager Software Engineering",
                startDate: "2024-02-01",
                endDate: null,
                location: "Remote",
                summary: "Lead engineering teams delivering customer-facing products and shared platform capabilities across modern web, mobile, and Azure environments. Pair organizational leadership with hands-on architecture and implementation.",
                highlights: [
                    "Led delivery and operational standards across a portfolio of 20+ applications, including five new launches in my first year as senior manager.",
                    "Reduced the security-remediation backlog by roughly 80% and improved critical-item resolution to about two days.",
                    "Built a self-sustaining feature-intake and mentorship model that increased team autonomy and removed single-person dependencies.",
                    "Scaled practical AI adoption through a 15-session workshop series, reusable tooling, and rapid delivery of working prototypes."
                ]
            },
            {
                company: "Acuity Brands",
                title: "Senior Software Engineer",
                startDate: "2021-03-01",
                endDate: "2024-02-01",
                location: "",
                summary: "Combined senior engineering with de facto team leadership, owning planning, architecture, stakeholder alignment, mentoring, and delivery while continuing to build production software.",
                highlights: [
                    "Led customer-portal and enterprise-data applications from requirements and refinement through production launch.",
                    "Built reusable React, Next.js, and Node.js platform capabilities spanning accessibility, internationalization, feature management, and observability.",
                    "Demonstrated rapid delivery by producing first-pass application frontends in approximately 19 to 35 hours rather than weeks."
                ]
            },
            {
                company: "Acuity Brands",
                title: "Application Developer",
                startDate: "2015-05-01",
                endDate: "2021-03-01",
                location: "Atlanta Metropolitan Area",
                summary: "Built web and mobile applications, partnered across product and field teams, and grew from individual contributor into a squad lead responsible for customer priorities and delivery.",
                highlights: [
                    "Reduced bugs by 94% and crashes by 82% in a mission-critical commissioning application while maintaining full availability for its general-release channel.",
                    "Continued advising and training the successor team after transferring organizations, preserving product knowledge and delivery continuity."
                ]
            },
            {
                company: "Apple",
                title: "AppleCare Advisor",
                startDate: "2013-05-01",
                endDate: "2015-05-01",
                location: "",
                summary: "Resolved complex technical issues for customers and employees while serving as a senior advisor, mentor, and team resource; ranked within the top 1% of the area."
            },
            {
                company: "University of Georgia",
                title: "Security",
                startDate: "2013-01-01",
                endDate: "2013-05-01",
                location: "",
                summary: "Helped protect residents and university property across campus housing; became the first freshman selected for the position without prior experience."
            },
            {
                company: "Moe's Southwest Grill",
                title: "Manager",
                startDate: "2011-06-01",
                endDate: "2012-08-01",
                location: "",
                summary: "Developed an early foundation in teamwork, accountability, and hands-on leadership in a fast-paced service environment."
            }
        ];

        function parseLocalDate(dateString) {
            const [year, month, day] = dateString.split('-').map(Number);
            return new Date(year, month - 1, day);
        }

        // Calculate duration without the UTC-to-local shift caused by new Date('YYYY-MM-DD').
        function calculateDuration(startDate, endDate = null) {
            const start = parseLocalDate(startDate);
            const end = endDate ? parseLocalDate(endDate) : new Date();
            
            const years = end.getFullYear() - start.getFullYear();
            const months = end.getMonth() - start.getMonth();
            
            let totalMonths = years * 12 + months;

            if (end.getDate() < start.getDate()) {
                totalMonths--;
            }

            totalMonths = Math.max(0, totalMonths);
            
            const yearsDisplay = Math.floor(totalMonths / 12);
            const monthsDisplay = totalMonths % 12;
            
            let durationString = '';
            if (yearsDisplay > 0) {
                durationString += `${yearsDisplay} yr${yearsDisplay > 1 ? 's' : ''} `;
            }
            if (monthsDisplay > 0) {
                durationString += `${monthsDisplay} mo${monthsDisplay > 1 ? 's' : ''}`;
            }
            
            return {
                fullDuration: durationString.trim(),
                endDateLabel: endDate ? endDate.split('-')[0] : 'Present'
            };
        }

        // Render timeline
        function renderTimeline() {
            const container = document.getElementById('timelineContainer');
            
            if (!container) {
                console.error('Timeline container not found');
                return;
            }
            
            container.replaceChildren();

            experiences.forEach((exp, index) => {
                const duration = calculateDuration(exp.startDate, exp.endDate);
                const startYear = exp.startDate.split('-')[0];
                
                const item = document.createElement('div');
                item.className = 'timeline-item';
                item.dataset.reveal = '';
                item.style.setProperty('--reveal-delay', `${Math.min(index, 3) * 80}ms`);

                const highlights = exp.highlights?.length
                    ? `<ul class="job-highlights">${exp.highlights.map(highlight => `<li>${highlight}</li>`).join('')}</ul>`
                    : '';
                
                item.innerHTML = `
                    <article class="timeline-content" aria-label="${exp.title} at ${exp.company}">
                        <h3 class="company-name">${exp.company}</h3>
                        <p class="job-title">${exp.title}</p>
                        <p class="job-duration">${duration.fullDuration} • <time datetime="${exp.startDate}">${startYear}</time> - ${duration.endDateLabel}</p>
                        ${exp.location ? `<p class="job-duration">${exp.location}</p>` : ''}
                        <p class="job-summary">${exp.summary}</p>
                        ${highlights}
                    </article>
                    <div class="timeline-dot" aria-hidden="true"></div>
                `;
                
                container.appendChild(item);
            });
        }

        // Background animation
        function createParticles() {
            const container = document.getElementById('bgAnimation');
            if (!container) return;
            
            // Clear existing particles
            container.innerHTML = '';

            if (reducedMotionQuery.matches) return;
            
            const particleCount = window.innerWidth < 768 ? 15 : 30;
            
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.width = Math.random() * 3 + 1 + 'px';
                particle.style.height = particle.style.width;
                particle.style.setProperty('--particle-duration', `${Math.random() * 16 + 14}s`);
                particle.style.setProperty('--particle-delay', `${Math.random() * -24}s`);
                particle.style.setProperty('--particle-drift', `${Math.random() * 120 - 60}px`);
                particle.style.setProperty('--particle-opacity', `${Math.random() * 0.1 + 0.05}`);
                particle.style.setProperty('--particle-blur', `${Math.random() > 0.75 ? 1 : 0}px`);
                container.appendChild(particle);
            }
        }

        // Scroll indicator
        function updateScrollIndicator() {
            const scrollTop = window.pageYOffset;
            const docHeight = document.body.scrollHeight - window.innerHeight;
            const scrollPercent = docHeight > 0 ? scrollTop / docHeight : 0;
            
            document.getElementById('scrollIndicator').style.transform = `scaleX(${scrollPercent})`;
        }

        function setupAnchorScrolling() {
            document.querySelectorAll('.nav-link, .cta-button').forEach(link => {
                link.addEventListener('click', event => {
                    const url = new URL(link.href, window.location.href);
                    const isSamePage = url.origin === window.location.origin
                        && url.pathname === window.location.pathname
                        && url.search === window.location.search;
                    const target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));

                    if (!isSamePage || !target) return;

                    event.preventDefault();
                    target.scrollIntoView({
                        behavior: reducedMotionQuery.matches ? 'auto' : 'smooth',
                        block: 'start'
                    });
                    history.pushState(null, '', url.hash);
                });
            });
        }

        // Intersection Observer for animations
        function setupAnimations() {
            const revealElements = Array.from(document.querySelectorAll('[data-reveal]'));

            if (reducedMotionQuery.matches || !('IntersectionObserver' in window)) {
                revealElements.forEach(element => element.classList.add('is-visible'));
                return;
            }

            document.body.classList.add('reveal-ready');

            document.querySelectorAll('.about-cards, .impact-grid, .contact-grid').forEach(group => {
                Array.from(group.children).forEach((element, index) => {
                    element.style.setProperty('--reveal-delay', `${index * 90}ms`);
                });
            });

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

            revealElements.forEach(element => observer.observe(element));
        }

        // Navigation active state on scroll
        function setupNavigation() {
            const sections = document.querySelectorAll('section');
            const navLinks = document.querySelectorAll('.nav-link');     

            window.addEventListener('scroll', () => {
                let current = '';
                const scrollPosition = window.pageYOffset + 200; // Add offset for better trigger point
             
                // Check if we're at the bottom of the page
                const isAtBottom = window.innerHeight + window.pageYOffset >= document.body.offsetHeight - 10;
             
                sections.forEach(section => {
                    const sectionTop = section.offsetTop;
                    const sectionBottom = sectionTop + section.clientHeight;
                 
                    // If at bottom of page, set current to the last section
                    if (isAtBottom) {
                        current = sections[sections.length - 1].getAttribute('id');
                    }
                    // Otherwise, check if scroll position is within this section
                    else if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                        current = section.getAttribute('id');
                    }
                });     

                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${current}`) {
                        link.classList.add('active');
                        link.setAttribute('aria-current', 'location');
                    } else {
                        link.removeAttribute('aria-current');
                    }
                });
            });
        }

        // Konami Code Detection
        const konamiCode = [
            'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
            'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
            'KeyB', 'KeyA'
        ];
        let konamiIndex = 0;

        function handleKonamiCode(event) {
            if (event.code === konamiCode[konamiIndex]) {
                konamiIndex++;
                if (konamiIndex === konamiCode.length) {
                    konamiIndex = 0;
                    showTetris();
                }
            } else {
                konamiIndex = 0;
            }
        }

        // Tetris Game Implementation
        class TetrisGame {
            constructor(canvas) {
                this.canvas = canvas;
                this.ctx = canvas.getContext('2d');
                this.blockSize = 30;
                this.cols = 10;
                this.rows = 20;
                this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
                this.score = 0;
                this.lines = 0;
                this.level = 1;
                this.dropTime = 1000;
                this.lastTime = 0;
                this.gameRunning = false;
                this.isPaused = false;
                
                this.colors = [
                    '#000000', // empty
                    '#00d4ff', // I
                    '#0099ff', // O  
                    '#0066cc', // T
                    '#4285f4', // S
                    '#5e97f6', // Z
                    '#74a9f9', // J
                    '#89bbfc'  // L
                ];
                
                this.pieces = [
                    [[[1,1,1,1]],[[1],[1],[1],[1]]], // I
                    [[[1,1],[1,1]]], // O
                    [[[0,1,0],[1,1,1]],[[1,0],[1,1],[1,0]],[[1,1,1],[0,1,0]],[[0,1],[1,1],[0,1]]], // T
                    [[[0,1,1],[1,1,0]],[[1,0],[1,1],[0,1]]], // S
                    [[[1,1,0],[0,1,1]],[[0,1],[1,1],[1,0]]], // Z
                    [[[1,0,0],[1,1,1]],[[1,1],[1,0],[1,0]],[[1,1,1],[0,0,1]],[[0,1],[0,1],[1,1]]], // J
                    [[[0,0,1],[1,1,1]],[[1,0],[1,0],[1,1]],[[1,1,1],[1,0,0]],[[1,1],[0,1],[0,1]]] // L
                ];
                
                this.currentPiece = this.getNewPiece();
                this.init();
            }
            
            init() {
                this.canvas.width = this.cols * this.blockSize;
                this.canvas.height = this.rows * this.blockSize;
                this.ctx.scale(1, 1);
            }
            
            getNewPiece() {
                const type = Math.floor(Math.random() * this.pieces.length);
                return {
                    type: type + 1,
                    shape: this.pieces[type][0],
                    rotation: 0,
                    x: Math.floor(this.cols / 2) - Math.floor(this.pieces[type][0][0].length / 2),
                    y: 0
                };
            }
            
            isValidMove(piece, dx, dy, rotation) {
                const newX = piece.x + dx;
                const newY = piece.y + dy;
                const shape = rotation !== undefined ? this.pieces[piece.type - 1][rotation] : piece.shape;
                
                for (let y = 0; y < shape.length; y++) {
                    for (let x = 0; x < shape[y].length; x++) {
                        if (shape[y][x]) {
                            const boardX = newX + x;
                            const boardY = newY + y;
                            
                            if (boardX < 0 || boardX >= this.cols || 
                                boardY >= this.rows || 
                                (boardY >= 0 && this.board[boardY][boardX])) {
                                return false;
                            }
                        }
                    }
                }
                return true;
            }
            
            placePiece() {
                for (let y = 0; y < this.currentPiece.shape.length; y++) {
                    for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                        if (this.currentPiece.shape[y][x]) {
                            const boardY = this.currentPiece.y + y;
                            const boardX = this.currentPiece.x + x;
                            if (boardY >= 0) {
                                this.board[boardY][boardX] = this.currentPiece.type;
                            }
                        }
                    }
                }
                
                this.clearLines();
                this.currentPiece = this.getNewPiece();
                
                if (!this.isValidMove(this.currentPiece, 0, 0)) {
                    this.gameOver();
                }
            }
            
            clearLines() {
                let linesCleared = 0;
                
                for (let y = this.rows - 1; y >= 0; y--) {
                    if (this.board[y].every(cell => cell !== 0)) {
                        this.board.splice(y, 1);
                        this.board.unshift(Array(this.cols).fill(0));
                        linesCleared++;
                        y++; // Check the same line again
                    }
                }
                
                if (linesCleared > 0) {
                    this.lines += linesCleared;
                    this.score += linesCleared * 100 * this.level;
                    this.level = Math.floor(this.lines / 10) + 1;
                    this.dropTime = Math.max(100, 1000 - (this.level - 1) * 100);
                    this.updateUI();
                }
            }
            
            drop() {
                if (this.isValidMove(this.currentPiece, 0, 1)) {
                    this.currentPiece.y++;
                } else {
                    this.placePiece();
                }
            }
            
            hardDrop() {
                while (this.isValidMove(this.currentPiece, 0, 1)) {
                    this.currentPiece.y++;
                    this.score += 2;
                }
                this.placePiece();
                this.updateUI();
            }
            
            move(dx) {
                if (this.isValidMove(this.currentPiece, dx, 0)) {
                    this.currentPiece.x += dx;
                }
            }
            
            rotate() {
                const newRotation = (this.currentPiece.rotation + 1) % this.pieces[this.currentPiece.type - 1].length;
                if (this.isValidMove(this.currentPiece, 0, 0, newRotation)) {
                    this.currentPiece.rotation = newRotation;
                    this.currentPiece.shape = this.pieces[this.currentPiece.type - 1][newRotation];
                }
            }
            
            draw() {
                // Clear canvas
                this.ctx.fillStyle = '#0a0a0a';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                // Draw board
                for (let y = 0; y < this.rows; y++) {
                    for (let x = 0; x < this.cols; x++) {
                        if (this.board[y][x]) {
                            this.ctx.fillStyle = this.colors[this.board[y][x]];
                            this.ctx.fillRect(x * this.blockSize, y * this.blockSize, 
                                            this.blockSize - 1, this.blockSize - 1);
                        }
                    }
                }
                
                // Draw current piece
                this.ctx.fillStyle = this.colors[this.currentPiece.type];
                for (let y = 0; y < this.currentPiece.shape.length; y++) {
                    for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                        if (this.currentPiece.shape[y][x]) {
                            const drawX = (this.currentPiece.x + x) * this.blockSize;
                            const drawY = (this.currentPiece.y + y) * this.blockSize;
                            this.ctx.fillRect(drawX, drawY, this.blockSize - 1, this.blockSize - 1);
                        }
                    }
                }
                
                // Draw grid lines
                this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
                this.ctx.lineWidth = 1;
                for (let x = 0; x <= this.cols; x++) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(x * this.blockSize, 0);
                    this.ctx.lineTo(x * this.blockSize, this.canvas.height);
                    this.ctx.stroke();
                }
                for (let y = 0; y <= this.rows; y++) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, y * this.blockSize);
                    this.ctx.lineTo(this.canvas.width, y * this.blockSize);
                    this.ctx.stroke();
                }
            }
            
            update(time) {
                if (!this.gameRunning || this.isPaused) return;
                
                const deltaTime = time - this.lastTime;
                
                if (deltaTime > this.dropTime) {
                    this.drop();
                    this.lastTime = time;
                }
                
                this.draw();
                
                if (this.gameRunning) {
                    requestAnimationFrame(this.update.bind(this));
                }
            }
            
            start() {
                this.gameRunning = true;
                this.lastTime = performance.now();
                this.update(this.lastTime);
            }
            
            pause() {
                this.isPaused = !this.isPaused;
                if (!this.isPaused) {
                    this.lastTime = performance.now();
                    this.update(this.lastTime);
                }
            }
            
            gameOver() {
                this.gameRunning = false;
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                this.ctx.fillStyle = '#00d4ff';
                this.ctx.font = 'bold 24px Inter';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
                
                this.ctx.font = '16px Inter';
                this.ctx.fillText('Press R or Restart to play again', this.canvas.width / 2, this.canvas.height / 2 + 40);
            }
            
            restart() {
                this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
                this.score = 0;
                this.lines = 0;
                this.level = 1;
                this.dropTime = 1000;
                this.currentPiece = this.getNewPiece();
                this.updateUI();
                this.start();
            }
            
            updateUI() {
                document.getElementById('scoreValue').textContent = this.score;
                document.getElementById('levelValue').textContent = this.level;
                document.getElementById('linesValue').textContent = this.lines;
            }
        }

        let tetrisGame = null;
        let tetrisKeyHandler = null;
        let previousFocus = null;

        function runTetrisAction(action) {
            if (!tetrisGame) return;
            if (!tetrisGame.gameRunning && action !== 'restart') return;

            switch (action) {
                case 'left':
                    tetrisGame.move(-1);
                    break;
                case 'right':
                    tetrisGame.move(1);
                    break;
                case 'down':
                    tetrisGame.drop();
                    break;
                case 'rotate':
                    tetrisGame.rotate();
                    break;
                case 'drop':
                    tetrisGame.hardDrop();
                    break;
                case 'pause':
                    tetrisGame.pause();
                    break;
                case 'restart':
                    tetrisGame.restart();
                    break;
            }

            tetrisGame.draw();
        }

        function trapModalFocus(event, modal) {
            const focusableElements = Array.from(
                modal.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')
            ).filter(element => element.getClientRects().length > 0);

            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }

        function showTetris() {
            const modal = document.getElementById('tetrisModal');
            const canvas = document.getElementById('tetrisBoard');
            const closeButton = document.getElementById('closeTetris');

            if (!modal.hidden) return;
            
            previousFocus = document.activeElement;
            modal.hidden = false;
            document.documentElement.classList.add('modal-open');
            document.body.classList.add('modal-open');
            
            // Create new game instance
            tetrisGame = new TetrisGame(canvas);
            
            // Set up controls
            tetrisKeyHandler = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    closeTetris();
                    return;
                }

                if (e.key === 'Tab') {
                    trapModalFocus(e, modal);
                    return;
                }

                if (!tetrisGame || !tetrisGame.gameRunning) {
                    if (e.key === 'r' || e.key === 'R') {
                        tetrisGame.restart();
                    }
                    return;
                }
                
                switch(e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        runTetrisAction('left');
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        runTetrisAction('right');
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        runTetrisAction('down');
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        runTetrisAction('rotate');
                        break;
                    case ' ':
                        e.preventDefault();
                        runTetrisAction('drop');
                        break;
                    case 'p':
                    case 'P':
                        e.preventDefault();
                        runTetrisAction('pause');
                        break;
                }
            };
            
            document.addEventListener('keydown', tetrisKeyHandler);
            tetrisGame.start();
            closeButton.focus();
        }

        function closeTetris() {
            const modal = document.getElementById('tetrisModal');
            modal.hidden = true;
            document.documentElement.classList.remove('modal-open');
            document.body.classList.remove('modal-open');
            
            if (tetrisGame) {
                tetrisGame.gameRunning = false;
                tetrisGame = null;
            }
            
            if (tetrisKeyHandler) {
                document.removeEventListener('keydown', tetrisKeyHandler);
                tetrisKeyHandler = null;
            }

            if (previousFocus instanceof HTMLElement) {
                previousFocus.focus();
            }

            previousFocus = null;
        }

        // Initialize everything
        document.addEventListener('DOMContentLoaded', () => {
            createParticles();
            renderTimeline();
            setupAnimations();
            setupAnchorScrolling();
            setupNavigation();

            document.addEventListener('keydown', handleKonamiCode);

            document.getElementById('currentYear').textContent = new Date().getFullYear();
            document.getElementById('closeTetris').addEventListener('click', closeTetris);
            document.getElementById('openTetris').addEventListener('click', showTetris);
            document.querySelectorAll('[data-tetris-action]').forEach(button => {
                button.addEventListener('click', () => runTetrisAction(button.dataset.tetrisAction));
            });

            reducedMotionQuery.addEventListener('change', createParticles);
            window.addEventListener('scroll', updateScrollIndicator, { passive: true });

            let resizeTimer;
            window.addEventListener('resize', () => {
                window.clearTimeout(resizeTimer);
                resizeTimer = window.setTimeout(createParticles, 150);
            });

            updateScrollIndicator();
        });
