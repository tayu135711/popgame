// Simple Projectile (Linear movement, used by allies/turrets)
class SimpleProjectile {
    constructor(opts) {
        this.x = opts.x || 0;
        this.y = opts.y || 0;
        this.vx = opts.vx || 0;
        this.vy = opts.vy || 0;
        this.type = opts.type || 'bullet';
        this.owner = opts.owner || 'player';
        this.damage = opts.damage || 1;
        this.life = opts.life || 60;
        this.w = opts.w || 6;
        this.h = opts.h || 6;
        this.color = opts.color || '#FF0';
        this.active = true;
        // Calculate direction, ensuring it's never 0 or NaN
        const sign = Math.sign(this.vx);
        this.dir = (sign === 0 || isNaN(sign)) ? 1 : sign; // 1 for right, -1 for left

        // Ensure phase is set for renderer compatibility if needed (though renderer uses duck typing now)
        this.phase = 'flying';
    }

    update() {
        if (!this.active) return;
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        if (this.life <= 0) {
            if (this.onHit) try { this.onHit(); } catch(e) {}
            this.active = false;
        }

        // Simple bounds check (optional)
        if (this.x < -100 || this.x > CONFIG.CANVAS_WIDTH + 100) this.active = false;
    }

    draw(ctx) {
        if (!this.active) return;
        if (window.Renderer) {
            window.Renderer.drawProjectile(ctx, this);
        }
    }
}
window.SimpleProjectile = SimpleProjectile;
