
        (() => {
            const canvas = document.getElementById('game')
            const ctx = canvas.getContext('2d')

            const ui = {
                score: document.getElementById('score'),
                lives: document.getElementById('lives'),
                level: document.getElementById('level'),
                status: document.getElementById('status'),
                menu: document.getElementById('menu'),
                how: document.getElementById('how'),
                howto: document.getElementById('howto'),
                howClose: document.getElementById('howClose'),
                start: document.getElementById('start'),
                touch: {
                    left: document.getElementById('left'),
                    right: document.getElementById('right'),
                    fire: document.getElementById('fire')
                }
            }

            // --- Game constants ---
            const WORLD = { w: canvas.width, h: canvas.height, ground: canvas.height - 40 }
            const COLORS = {
                player: '#5ee6ff',
                bullet: '#e6f0ff',
                enemy1: '#ff87ab',
                enemy2: '#ffd166',
                enemy3: '#a0f79b',
                enemyBullet: '#ff6b6b',
                shield: '#7cc5ff'
            }

            const STATE = {
                running: false,
                paused: false,
                level: 1,
                score: 0,
                lives: 3,
            }

            function rand(min, max) { return Math.random() * (max - min) + min }

            // --- Entities ---
            class Player {
                constructor() {
                    this.w = 46; this.h = 18
                    this.x = (WORLD.w - this.w) / 2; this.y = WORLD.ground - this.h
                    this.speed = 320 // px/sec
                    this.cooldown = 0 // seconds
                }
                update(dt, input) {
                    if (input.left) this.x -= this.speed * dt
                    if (input.right) this.x += this.speed * dt
                    this.x = Math.max(10, Math.min(WORLD.w - this.w - 10, this.x))
                    this.cooldown = Math.max(0, this.cooldown - dt)
                    if (input.fire && this.cooldown === 0) {
                        bullets.push(new Bullet(this.x + this.w / 2, this.y))
                        this.cooldown = 0.25 // 250ms
                    }
                }
                draw() {
                    // Ship body
                    ctx.fillStyle = COLORS.player
                    ctx.fillRect(this.x, this.y, this.w, this.h)
                    // Triangle nose
                    ctx.beginPath()
                    ctx.moveTo(this.x + this.w / 2, this.y - 10)
                    ctx.lineTo(this.x + this.w * 0.8, this.y)
                    ctx.lineTo(this.x + this.w * 0.2, this.y)
                    ctx.closePath()
                    ctx.fill()
                    // Glow
                    ctx.shadowColor = COLORS.player
                    ctx.shadowBlur = 25
                    ctx.fillRect(this.x + this.w / 2 - 2, this.y + this.h, 4, 6)
                    ctx.shadowBlur = 0
                }
            }

            class Bullet {
                constructor(x, y) { this.x = x; this.y = y; this.r = 3; this.speed = 520; this.alive = true }
                update(dt) { this.y -= this.speed * dt; if (this.y < -20) this.alive = false }
                draw() {
                    ctx.fillStyle = COLORS.bullet
                    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill()
                }
            }

            class EnemyBullet {
                constructor(x, y) { this.x = x; this.y = y; this.r = 3; this.speed = 260; this.alive = true }
                update(dt) { this.y += this.speed * dt; if (this.y > WORLD.h + 20) this.alive = false }
                draw() {
                    ctx.fillStyle = COLORS.enemyBullet
                    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill()
                }
            }

            class Enemy {
                constructor(x, y, tier = 1) {
                    this.x = x; this.y = y; this.w = 36; this.h = 22; this.tier = tier; this.alive = true; this.cooldown = rand(.8, 2.2)
                }
                draw() {
                    const color = this.tier === 1 ? COLORS.enemy1 : this.tier === 2 ? COLORS.enemy2 : COLORS.enemy3
                    ctx.fillStyle = color
                    // little pixel-art alien
                    const { x, y, w, h } = this
                    ctx.fillRect(x, y, w, h * 0.35)
                    ctx.fillRect(x + w * 0.15, y + h * 0.35, w * 0.7, h * 0.35)
                    ctx.fillRect(x + w * 0.1, y + h * 0.7, w * 0.15, h * 0.3)
                    ctx.fillRect(x + w * 0.75, y + h * 0.7, w * 0.15, h * 0.3)
                }
            }

            class Shield {
                constructor(x, y) { this.x = x; this.y = y; this.w = 70; this.h = 26; this.hp = 8 }
                draw() {
                    const alpha = Math.max(0.25, this.hp / 8)
                    ctx.fillStyle = `rgba(124,197,255,${alpha})`
                    ctx.fillRect(this.x, this.y, this.w, this.h)
                    ctx.strokeStyle = '#bfe2ff'
                    ctx.lineWidth = 2
                    ctx.strokeRect(this.x, this.y, this.w, this.h)
                }
            }

            // --- Game objects ---
            let player = new Player()
            let bullets = []
            let enemies = []
            let enemyBullets = []
            let shields = []

            function setupLevel(level = 1) {
                enemies = []
                enemyBullets = []
                bullets = []
                shields = []

                const rows = Math.min(5 + Math.floor(level / 2), 8)
                const cols = Math.min(8 + Math.floor(level / 1.5), 12)
                const xMargin = 60, yMargin = 60, gapX = 16, gapY = 18
                const totalWidth = cols * 36 + (cols - 1) * gapX
                const startX = (WORLD.w - totalWidth) / 2
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const x = startX + c * (36 + gapX)
                        const y = yMargin + r * (22 + gapY)
                        const tier = r < 2 ? 3 : r < 4 ? 2 : 1
                        enemies.push(new Enemy(x, y, tier))
                    }
                }
                // Shields
                const shieldCount = 3
                for (let i = 0; i < shieldCount; i++) {
                    const x = 80 + i * ((WORLD.w - 160) / (shieldCount - 1)) - 35
                    shields.push(new Shield(x, WORLD.ground - 110))
                }

                swarm.dx = 24 + Math.min(90, level * 8) // base horizontal speed
                swarm.direction = 1 // 1 -> right, -1 -> left
                swarm.drop = 18 + Math.min(42, level * 3)
                swarm.timer = 0
            }

            const swarm = { dx: 28, direction: 1, drop: 18, timer: 0 }

            // --- Input ---
            const input = { left: false, right: false, fire: false }
            const keyMap = {
                ArrowLeft: 'left', ArrowRight: 'right', Space: 'fire',
                KeyA: 'left', KeyD: 'right'
            }
            window.addEventListener('keydown', (e) => {
                if (e.code in keyMap) { input[keyMap[e.code]] = true; e.preventDefault() }
                if (e.code === 'KeyP') togglePause()
                if (!STATE.running && e.code === 'Space') startGame()
            })
            window.addEventListener('keyup', (e) => { if (e.code in keyMap) { input[keyMap[e.code]] = false; e.preventDefault() } })

            // Touch controls
            let touchLeft = false, touchRight = false
            const bindHold = (el, on, off) => {
                let down = false
                const start = (e) => { e.preventDefault(); down = true; on() }
                const end = (e) => { e.preventDefault(); down = false; off() }
                el.addEventListener('pointerdown', start)
                window.addEventListener('pointerup', end)
                el.addEventListener('pointerleave', end)
            }
            bindHold(ui.touch.left, () => { input.left = true }, () => { input.left = false })
            bindHold(ui.touch.right, () => { input.right = true }, () => { input.right = false })
            bindHold(ui.touch.fire, () => { input.fire = true }, () => { input.fire = false })

            // --- Core loop ---
            let last = 0
            function loop(ts) {
                if (!STATE.running) { requestAnimationFrame(loop); return }
                const dt = Math.min(0.033, (ts - last) / 1000)
                last = ts
                if (!STATE.paused) update(dt)
                draw()
                requestAnimationFrame(loop)
            }

            function update(dt) {
                player.update(dt, input)

                // Update bullets
                bullets.forEach(b => b.update(dt))
                bullets = bullets.filter(b => b.alive)

                // Enemy movement as a group
                // Determine bounds
                let minX = Infinity, maxX = -Infinity
                enemies.forEach(e => { minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x + e.w) })
                if (enemies.length) {
                    if (minX <= 10 && swarm.direction < 0) { swarm.direction = 1; dropSwarm() }
                    if (maxX >= WORLD.w - 10 && swarm.direction > 0) { swarm.direction = -1; dropSwarm() }
                }
                enemies.forEach(e => { e.x += swarm.dx * dt * swarm.direction })

                // Enemy fire logic
                swarm.timer -= dt
                const fireInterval = Math.max(0.35, 1.2 - STATE.level * 0.08)
                if (swarm.timer <= 0 && enemies.length) {
                    swarm.timer = fireInterval
                    // choose random bottom-most enemy column to fire
                    const columns = {}
                    enemies.forEach(e => { const col = Math.round(e.x / 52); columns[col] = columns[col] ? (e.y > columns[col].y ? e : columns[col]) : e })
                    const choices = Object.values(columns)
                    const shooter = choices[Math.floor(Math.random() * choices.length)]
                    enemyBullets.push(new EnemyBullet(shooter.x + shooter.w / 2, shooter.y + shooter.h))
                }

                enemyBullets.forEach(b => b.update(dt))
                enemyBullets = enemyBullets.filter(b => b.alive)

                // Collisions: bullets vs enemies
                bullets.forEach(b => {
                    enemies.forEach(e => {
                        if (!e.alive) return
                        if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
                            e.alive = false; b.alive = false
                            STATE.score += e.tier * 10
                            flash(e.x + e.w / 2, e.y + e.h / 2, '#ffffff')
                        }
                    })
                })
                enemies = enemies.filter(e => e.alive)

                // Bullets vs shields, enemyBullets vs shields
                function hitShield(b) {
                    for (const s of shields) {
                        if (b.x > s.x && b.x < s.x + s.w && b.y > s.y && b.y < s.y + s.h && s.hp > 0) {
                            s.hp -= 1; b.alive = false; return true
                        }
                    }
                    return false
                }
                bullets.forEach(hitShield)
                enemyBullets.forEach(hitShield)

                // Enemy bullets vs player
                enemyBullets.forEach(b => {
                    if (b.x > player.x && b.x < player.x + player.w && b.y > player.y && b.y < player.y + player.h) {
                        b.alive = false
                        damagePlayer()
                    }
                })

                // Enemies reach ground
                enemies.forEach(e => {
                    if (e.y + e.h >= WORLD.ground) {
                        gameOver()
                    }
                })

                ui.score.textContent = STATE.score
                ui.lives.textContent = STATE.lives
                ui.level.textContent = STATE.level
            }

            function draw() {
                // Background stars
                ctx.clearRect(0, 0, canvas.width, canvas.height)
                drawStars()

                // Ground line
                ctx.strokeStyle = 'rgba(255,255,255,.15)'
                ctx.beginPath()
                ctx.moveTo(0, WORLD.ground)
                ctx.lineTo(WORLD.w, WORLD.ground)
                ctx.stroke()

                // Entities
                shields.forEach(s => s.draw())
                player.draw()
                bullets.forEach(b => b.draw())
                enemies.forEach(e => e.draw())
                enemyBullets.forEach(b => b.draw())

                // Flashes
                flashes = flashes.filter(f => f.t > 0)
                flashes.forEach(f => {
                    f.t -= 0.016
                    ctx.globalAlpha = Math.max(0, f.t)
                    ctx.fillStyle = f.c
                    ctx.beginPath(); ctx.arc(f.x, f.y, 16 * (1 + (1 - f.t) * 3), 0, Math.PI * 2); ctx.fill()
                    ctx.globalAlpha = 1
                })

                // Pause indicator
                if (STATE.paused) {
                    ctx.fillStyle = 'rgba(0,0,0,.45)'
                    ctx.fillRect(0, 0, WORLD.w, WORLD.h)
                    ctx.fillStyle = '#fff'
                    ctx.font = '700 28px system-ui'
                    ctx.textAlign = 'center'
                    ctx.fillText('Paused (press P to resume)', WORLD.w / 2, WORLD.h / 2)
                }

                // Win/next-level banner when no enemies
                if (STATE.running && enemies.length === 0 && !STATE.paused) {
                    nextLevel()
                }
            }

            // Simple starfield
            const stars = Array.from({ length: 120 }, () => ({ x: Math.random() * 800, y: Math.random() * 600, r: Math.random() * 1.6 + .4, s: Math.random() * 0.3 + 0.1 }))
            function drawStars() {
                for (const st of stars) {
                    ctx.fillStyle = 'rgba(255,255,255,.9)'
                    ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill()
                    st.y += st.s; if (st.y > WORLD.h) st.y = -2
                }
            }

            // Damage & effects
            function damagePlayer() {
                STATE.lives -= 1
                shake(10, 300)
                flash(player.x + player.w / 2, player.y, '#ff6b6b')
                if (STATE.lives <= 0) gameOver()
            }

            let flashes = []
            function flash(x, y, c) { flashes.push({ x, y, c, t: 0.5 }) }

            let shaker = { m: 0, t: 0 }
            function shake(mag, ms) { shaker.m = mag; shaker.t = ms }

            // Apply screen shake to canvas via CSS transform
            setInterval(() => {
                if (shaker.t > 0) {
                    shaker.t -= 16
                    const dx = (Math.random() * 2 - 1) * shaker.m
                    const dy = (Math.random() * 2 - 1) * shaker.m
                    canvas.style.transform = `translate(${dx}px, ${dy}px)`
                } else {
                    canvas.style.transform = 'translate(0,0)'
                }
            }, 16)

            function dropSwarm() {
                enemies.forEach(e => { e.y += swarm.drop })
                swarm.dx *= 1.05 // speed up slightly on each edge hit
            }

            function startGame() {
                STATE.running = true; STATE.paused = false; STATE.level = 1; STATE.score = 0; STATE.lives = 3
                player = new Player()
                setupLevel(STATE.level)
                ui.menu.style.display = 'none'
                ui.howto.style.display = 'none'
                ui.status.textContent = 'Playing'
            }

            function nextLevel() {
                STATE.level += 1; ui.status.textContent = 'Level Up!'
                setupLevel(STATE.level)
            }

            function togglePause() {
                if (!STATE.running) return
                STATE.paused = !STATE.paused
                ui.status.textContent = STATE.paused ? 'Paused' : 'Playing'
            }

            function gameOver() {
                STATE.running = false; STATE.paused = false
                ui.status.textContent = 'Game Over'
                ui.menu.style.display = 'grid'
                ui.menu.querySelector('.card').innerHTML = `
      <h1>💥 Game Over</h1>
      <p>Your score: <b>${STATE.score}</b> — Level reached: <b>${STATE.level}</b></p>
      <div class="btns">
        <button class="btn" id="restart">Play Again</button>
        <button class="btn secondary" id="how">How to Play</button>
      </div>
    `
                ui.menu.querySelector('#restart').addEventListener('click', startGame)
                ui.menu.querySelector('#how').addEventListener('click', () => { ui.howto.style.display = 'grid' })
            }

            // Buttons
            ui.start.addEventListener('click', startGame)
            ui.how.addEventListener('click', () => { ui.howto.style.display = 'grid' })
            ui.howClose.addEventListener('click', () => { ui.howto.style.display = 'none' })

            // Start loop
            requestAnimationFrame(ts => { last = ts; loop(ts) })
        })();
    