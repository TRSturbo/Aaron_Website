        // Experience data
        const experiences = [
            {
                company: "Acuity Brands",
                title: "Senior Manager Software Engineering",
                startDate: "2024-02-01",
                endDate: null,
                location: "Remote",
                description: "Leading software engineering team, driving technical strategy and team development."
            },
            {
                company: "Acuity Brands",
                title: "Senior Software Engineer",
                startDate: "2021-03-01",
                endDate: "2024-02-01",
                location: "",
                description: "Developed and maintained complex software solutions, contributed to technical architecture and team growth."
            },
            {
                company: "Acuity Brands",
                title: "Application Developer",
                startDate: "2015-05-01",
                endDate: "2021-03-01",
                location: "Atlanta Metropolitan Area",
                description: "Designed and implemented web and mobile applications, collaborated on cross-functional projects."
            },
            {
                company: "Apple",
                title: "AppleCare Advisor",
                startDate: "2013-05-01",
                endDate: "2015-05-01",
                location: "",
                description: "Supported wide range of customers and employees at a technical level. Operated as a senior advisor, mentor and team aid. Fell within the top 1% of my area."
            },
            {
                company: "University of Georgia",
                title: "Security",
                startDate: "2013-01-01",
                endDate: "2013-05-01",
                location: "",
                description: "Protected the assets and safety of campus dormitories. First freshman to achieve the position without prior experience."
            },
            {
                company: "Moe's Southwest Grill",
                title: "Manager",
                startDate: "2011-06-01",
                endDate: "2012-08-01",
                location: "",
                description: "Learned discipline of teamwork and leadership. Engaged with team in a learning and hard-working environment dedicated to improvement."
            }
        ];

        // Calculate duration
        function calculateDuration(startDate, endDate = null) {
            const start = new Date(startDate);
            const end = endDate ? new Date(endDate) : new Date();
            
            const years = end.getFullYear() - start.getFullYear();
            const months = end.getMonth() - start.getMonth();
            
            let totalMonths = years * 12 + months;
            
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
            
            experiences.forEach((exp, index) => {
                const duration = calculateDuration(exp.startDate, exp.endDate);
                const startYear = exp.startDate.split('-')[0];
                
                const item = document.createElement('div');
                item.className = 'timeline-item';
                item.style.animationDelay = `${index * 0.2}s`;
                
                item.innerHTML = `
                    <div class="timeline-content">
                        <div class="company-name">${exp.company}</div>
                        <div class="job-title">${exp.title}</div>
                        <div class="job-duration">${duration.fullDuration} • ${startYear} - ${duration.endDateLabel}</div>
                        ${exp.location ? `<div class="job-duration">${exp.location}</div>` : ''}
                        <div class="job-description">${exp.description}</div>
                    </div>
                    <div class="timeline-dot"></div>
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
            
            const particleCount = window.innerWidth < 768 ? 15 : 30;
            
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.width = Math.random() * 3 + 1 + 'px';
                particle.style.height = particle.style.width;
                particle.style.animationDuration = (Math.random() * 15 + 10) + 's';
                particle.style.animationDelay = Math.random() * 15 + 's';
                container.appendChild(particle);
            }
        }

        // Smooth scrolling for navigation
        function setupSmoothScrolling() {
            document.querySelectorAll('.nav-link, .cta-button').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = link.getAttribute('href');
                    const target = document.querySelector(targetId);
                    
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                        
                        // Update active nav link
                        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                        if (link.classList.contains('nav-link')) {
                            link.classList.add('active');
                        }
                    }
                });
            });
        }

        // Scroll indicator
        function updateScrollIndicator() {
            const scrollTop = window.pageYOffset;
            const docHeight = document.body.scrollHeight - window.innerHeight;
            const scrollPercent = scrollTop / docHeight;
            
            document.getElementById('scrollIndicator').style.transform = `scaleX(${scrollPercent})`;
        }

        // Intersection Observer for animations
        function setupAnimations() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            }, { threshold: 0.1, rootMargin: '0px 0px -100px 0px' });

            // Apply initial styles and observe elements
            document.querySelectorAll('.about-card, .timeline-item').forEach(el => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(30px)';
                el.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
                observer.observe(el);
            });
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
                    [[[1,1,1,1]]], // I
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
                this.ctx.fillText('Press R to Restart', this.canvas.width / 2, this.canvas.height / 2 + 40);
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

        function showTetris() {
            const modal = document.getElementById('tetrisModal');
            const canvas = document.getElementById('tetrisBoard');
            
            modal.style.display = 'flex';
            
            // Create new game instance
            tetrisGame = new TetrisGame(canvas);
            
            // Set up controls
            tetrisKeyHandler = (e) => {
                if (!tetrisGame || !tetrisGame.gameRunning) {
                    if (e.key === 'r' || e.key === 'R') {
                        tetrisGame.restart();
                    }
                    return;
                }
                
                switch(e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        tetrisGame.move(-1);
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        tetrisGame.move(1);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        tetrisGame.drop();
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        tetrisGame.rotate();
                        break;
                    case ' ':
                        e.preventDefault();
                        tetrisGame.hardDrop();
                        break;
                    case 'p':
                    case 'P':
                        e.preventDefault();
                        tetrisGame.pause();
                        break;
                }
            };
            
            document.addEventListener('keydown', tetrisKeyHandler);
            tetrisGame.start();
        }

        function closeTetris() {
            const modal = document.getElementById('tetrisModal');
            modal.style.display = 'none';
            
            if (tetrisGame) {
                tetrisGame.gameRunning = false;
                tetrisGame = null;
            }
            
            if (tetrisKeyHandler) {
                document.removeEventListener('keydown', tetrisKeyHandler);
                tetrisKeyHandler = null;
            }
        }

        // Initialize everything
        document.addEventListener('DOMContentLoaded', () => {
            createParticles();
            renderTimeline();
            setupSmoothScrolling();
            setupAnimations();
            setupNavigation();

            document.addEventListener('keydown', handleKonamiCode);
            
            window.addEventListener('scroll', updateScrollIndicator);
            window.addEventListener('resize', () => {
                document.getElementById('bgAnimation').innerHTML = '';
                createParticles();
            });
        });