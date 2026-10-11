document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");

    const ARENA_SIZE = 1000;
    const WALL_THICKNESS = 6;

    const CLASSES_LITE = {
        Sword: { name: "Swordman", color: "#1f4068", radius: 26, speed: 4.8, hp: 120, damage: 15, type: "melee", hasSword: true },
        Fighter: { name: "Brawler", color: "#e94560", radius: 30, speed: 4.0, hp: 180, damage: 20, type: "melee" },
        Archer: { name: "Archer", color: "#126d2e", radius: 22, speed: 5.5, hp: 80, damage: 10, type: "ranged", range: 350 },
        Mage: { name: "Mage", color: "#7b2cbf", radius: 24, speed: 4.2, hp: 90, damage: 25, type: "ranged", range: 300 }
    };

    let liteBalls = [];
    let projectiles = [];

    let spawnCounts = {
        Sword: 0,
        Fighter: 0,
        Archer: 0,
        Mage: 0
    };

    let secretsUnlocked = {
        fighterOverload: false,
        mageChaos: false,
        allClassesActive: false
    };

    function triggerSecretLore(secretKey, title, description, imageUrl) {
        if (secretsUnlocked[secretKey]) return;
        secretsUnlocked[secretKey] = true;

        const modalHtml = `
            <div id="secretModal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.88); display: flex; justify-content: center; align-items: center; z-index: 9999; backdrop-filter: blur(6px); padding: 15px; box-sizing: border-box;">
                <div style="background: #12141c; border: 2px solid #e94560; max-width: 550px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 25px; border-radius: 6px; text-align: left; box-shadow: 0 0 40px rgba(233,69,96,0.4);">
                    <p style="color: #e94560; font-family: monospace; font-size: 11px; letter-spacing: 3px; margin-bottom: 8px;">// CLASSIFIED ARCHIVE // INCIDENT REPORT</p>
                    <h3 style="color: #fff; font-size: 18px; margin-bottom: 12px; text-transform: uppercase;">${title}</h3>
                    
                    ${imageUrl ? `<div style="margin-bottom: 15px; border: 1px solid #1f2833; border-radius: 4px; overflow: hidden; background: #0b0c10; display: flex; justify-content: center;"><img src="${imageUrl}" alt="Specimen Evidence" style="width: 100%; max-height: 280px; object-fit: contain; display: block;"></div>` : ''}
                    
                    <p style="color: #c5c6c7; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">${description}</p>
                    <button onclick="document.getElementById('secretModal').remove()" style="background: transparent; border: 1px solid #e94560; color: #e94560; padding: 10px 20px; font-size: 12px; font-family: monospace; cursor: pointer; width: 100%; letter-spacing: 1px;">ACKNOWLEDGE & CLOSE</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    function checkSecretsOnSpawn(className) {
        spawnCounts[className]++;

        if (className === 'Fighter' && spawnCounts['Fighter'] >= 15 && !secretsUnlocked.fighterOverload) {
            triggerSecretLore(
                'fighterOverload',
                'Subject Overload: Brawler Protocol (Specimen F-09)',
                'Unusual aggregation of Class-F units detected. Internal logs indicate aggressive cellular tissue proliferation and extreme forced muscle hypertrophy beyond structural safety limits. Subject manifested erratic aggressive behaviors prior to containment breach.',
                'assets/f09_specimen.png'
            );
        }

        if (className === 'Mage' && spawnCounts['Mage'] >= 10 && !secretsUnlocked.mageChaos) {
            triggerSecretLore(
                'mageChaos',
                'Neural Resonance Breach (Specimen M-03)',
                'High density of Class-M subjects generating severe local reality fluctuations and synaptic feedback loops. Neural constants are critically unstable. Avoid prolonged exposure to projection matrices. Subject M-03 manifested spatial dissociation.',
                'assets/m03_specimen.png'
            );
        }

        const activeClasses = new Set(liteBalls.map(b => b.className));
        if (activeClasses.size === 4 && !secretsUnlocked.allClassesActive) {
            triggerSecretLore(
                'allClassesActive',
                'Project Sexton: Full Spectrum Biological Synthesis',
                'All primary behavioral profiles (Sword, Brawler, Archer, Mage) successfully synchronized within the testing perimeter. Initial subject analysis indicates emergent collective intelligence and shared neural constants. This marks a critical success in Cognitive Mapping Frameworks.',
                'assets/sexton_synthesis.png'
            );
        }
    }

    class Projectile {
        constructor(x, y, vx, vy, color, damage) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.color = color;
            this.damage = damage;
            this.radius = 5;
            this.active = true;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > ARENA_SIZE || this.y < 0 || this.y > ARENA_SIZE) {
                this.active = false;
            }
        }

        draw() {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }
    }

    class LiteBall {
        constructor(x, y, className) {
            const stats = CLASSES_LITE[className];
            this.x = x;
            this.y = y;
            this.className = className;
            this.radius = stats.radius;
            this.color = stats.color;
            this.maxSpeed = stats.speed;
            this.hp = stats.hp;
            this.maxHp = stats.hp;
            this.damage = stats.damage;
            this.type = stats.type;
            this.hasSword = stats.hasSword || false;
            
            this.swordAngle = Math.random() * Math.PI * 2;
            this.shootCooldown = 0;

            this.vx = (Math.random() - 0.5) * this.maxSpeed * 2;
            this.vy = (Math.random() - 0.5) * this.maxSpeed * 2;
        }

        update() {
            this.vx += (Math.random() - 0.5) * 1.2;
            this.vy += (Math.random() - 0.5) * 1.2;

            const currentSpeed = Math.hypot(this.vx, this.vy);
            if (currentSpeed > this.maxSpeed * 1.8) {
                this.vx = (this.vx / currentSpeed) * this.maxSpeed;
                this.vy = (this.vy / currentSpeed) * this.maxSpeed;
            }

            this.x += this.vx;
            this.y += this.vy;

            if (this.hasSword) {
                this.swordAngle += 0.15;
            }

            if (this.type === "ranged") {
                if (this.shootCooldown > 0) {
                    this.shootCooldown--;
                } else {
                    let target = null;
                    let minDist = 400;
                    liteBalls.forEach(b => {
                        if (b !== this) {
                            const d = Math.hypot(b.x - this.x, b.y - this.y);
                            if (d < minDist) {
                                minDist = d;
                                target = b;
                            }
                        }
                    });

                    if (target) {
                        const angle = Math.atan2(target.y - this.y, target.x - this.x);
                        const projSpeed = 7;
                        projectiles.push(new Projectile(
                            this.x, this.y,
                            Math.cos(angle) * projSpeed,
                            Math.sin(angle) * projSpeed,
                            this.color,
                            this.damage
                        ));
                        this.shootCooldown = 60;
                    }
                }
            }

            const margin = WALL_THICKNESS;
            if (this.x - this.radius < margin) {
                this.x = margin + this.radius;
                this.vx *= -0.6; 
            } else if (this.x + this.radius > ARENA_SIZE - margin) {
                this.x = ARENA_SIZE - margin - this.radius;
                this.vx *= -0.6;
            }

            if (this.y - this.radius < margin) {
                this.y = margin + this.radius;
                this.vy *= -0.6;
            } else if (this.y + this.radius > ARENA_SIZE - margin) {
                this.y = ARENA_SIZE - margin - this.radius;
                this.vy *= -0.6;
            }
        }

        draw() {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#ffffff";
            ctx.stroke();

            if (this.hasSword) {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.swordAngle);
                ctx.fillStyle = "#c5c6c7";
                ctx.fillRect(this.radius + 2, -3, 18, 6);
                ctx.restore();
            }

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(this.className.substring(0, 2).toUpperCase(), this.x, this.y);

            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(this.x - 15, this.y - this.radius - 10, 30, 4);
            ctx.fillStyle = "#66fcf1";
            ctx.fillRect(this.x - 15, this.y - this.radius - 10, 30 * (this.hp / this.maxHp), 4);

            ctx.restore();
        }
    }

    function spawnLiteBall(className) {
        const spawnX = ARENA_SIZE / 2 + (Math.random() - 0.5) * 100;
        const spawnY = ARENA_SIZE / 2 + (Math.random() - 0.5) * 100;
        liteBalls.push(new LiteBall(spawnX, spawnY, className));
        
        checkSecretsOnSpawn(className);
    }

    function handleLiteCollisions() {
        for (let i = 0; i < liteBalls.length; i++) {
            for (let j = i + 1; j < liteBalls.length; j++) {
                const b1 = liteBalls[i];
                const b2 = liteBalls[j];

                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const dist = Math.hypot(dx, dy);
                const minDist = b1.radius + b2.radius;

                if (dist < minDist) {
                    const overlap = minDist - dist;
                    const nx = dx / (dist || 1);
                    const ny = dy / (dist || 1);

                    b1.x -= nx * overlap * 0.4;
                    b1.y -= ny * overlap * 0.4;
                    b2.x += nx * overlap * 0.4;
                    b2.y += ny * overlap * 0.4;

                    let tempVx = b1.vx;
                    let tempVy = b1.vy;
                    b1.vx = b2.vx * 0.75;
                    b1.vy = b2.vy * 0.75;
                    b2.vx = tempVx * 0.75;
                    b2.vy = tempVy * 0.75;

                    b1.hp -= 0.5;
                    b2.hp -= 0.5;
                    if (b1.hasSword) b2.hp -= 0.8;
                    if (b2.hasSword) b1.hp -= 0.8;
                }
            }
        }

        for (let p of projectiles) {
            if (!p.active) continue;
            for (let b of liteBalls) {
                const dist = Math.hypot(b.x - p.x, b.y - p.y);
                if (dist < b.radius + p.radius) {
                    b.hp -= p.damage;
                    p.active = false;
                    break;
                }
            }
        }

        liteBalls = liteBalls.filter(b => b.hp > 0);
        projectiles = projectiles.filter(p => p.active);
    }

    let gameInitialized = false;

    function initGame() {
        if (gameInitialized) return;

        canvas.width = ARENA_SIZE;
        canvas.height = ARENA_SIZE;

        liteBalls.push(new LiteBall(450, 450, "Sword"));
        liteBalls.push(new LiteBall(550, 450, "Fighter"));
        liteBalls.push(new LiteBall(500, 550, "Archer"));
        liteBalls.push(new LiteBall(520, 500, "Mage"));

        const btnSword = document.getElementById('btn-sword');
        const btnFighter = document.getElementById('btn-fighter');
        const btnArcher = document.getElementById('btn-archer');
        const btnMage = document.getElementById('btn-mage');

        if (btnSword) btnSword.addEventListener('click', () => spawnLiteBall('Sword'));
        if (btnFighter) btnFighter.addEventListener('click', () => spawnLiteBall('Fighter'));
        if (btnArcher) btnArcher.addEventListener('click', () => spawnLiteBall('Archer'));
        if (btnMage) btnMage.addEventListener('click', () => spawnLiteBall('Mage'));

        function loop() {
            ctx.clearRect(0, 0, ARENA_SIZE, ARENA_SIZE);

            ctx.strokeStyle = "#1f2833";
            ctx.lineWidth = WALL_THICKNESS;
            ctx.strokeRect(WALL_THICKNESS / 2, WALL_THICKNESS / 2, ARENA_SIZE - WALL_THICKNESS, ARENA_SIZE - WALL_THICKNESS);

            projectiles.forEach(p => {
                p.update();
                p.draw();
            });

            liteBalls.forEach(ball => {
                ball.update();
                ball.draw();
            });

            handleLiteCollisions();

            requestAnimationFrame(loop);
        }
        loop();
        gameInitialized = true;
    }

    if (canvas.offsetWidth > 0) {
        initGame();
    } else {
        const observer = new MutationObserver(() => {
            if (canvas.offsetWidth > 0) {
                initGame();
                observer.disconnect();
            }
        });
        observer.observe(canvas.closest('section') || document.body, { attributes: true, attributeFilter: ['class', 'style'] });
    }
});