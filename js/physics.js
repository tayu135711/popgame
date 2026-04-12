// ======================================
// PHYSICS - Shared Collision & Movement Logic
// ======================================

class Physics {
    /**
     * Resolves collision for an entity against platforms and world bounds.
     * Updates entity.x and entity.y based on entity.vx and entity.vy.
     * @param {Object} entity - The moving entity (must have x, y, w, h, vx, vy)
     * @param {Array} platforms - Array of wall/platform objects (x, y, w, h)
     * @param {Object} bounds - World bounds (left, right, top, bottom)
     * @returns {Object} result - { collidedX: boolean, collidedY: boolean }
     */
    static update(entity, platforms, bounds) {
        const result = { collidedX: false, collidedY: false };

        // ★バグ修正: entity の w/h/vx/vy が undefined または NaN の場合は安全な値に補正
        // NaN のまま演算すると境界チェックが全て false になり画面外脱出するバグを防ぐ
        if (!isFinite(entity.w) || entity.w <= 0) entity.w = 0;
        if (!isFinite(entity.h) || entity.h <= 0) entity.h = 0;
        if (!isFinite(entity.vx)) entity.vx = 0;
        if (!isFinite(entity.vy)) entity.vy = 0;
        if (!isFinite(entity.x)) entity.x = bounds ? bounds.left : 0;
        if (!isFinite(entity.y)) entity.y = bounds ? bounds.top  : 0;

        const oldX = entity.x;
        const oldY = entity.y;

        // 1. Horizontal Movement
        entity.x += entity.vx;
        let collideX = false;

        // World Bounds (X)
        if (bounds) {
            if (entity.x < bounds.left || entity.x + entity.w > bounds.right) collideX = true;
        }

        // Platforms (X)
        if (!collideX && platforms) {
            for (const wall of platforms) {
                if (Physics.checkAABB(entity, wall)) {
                    collideX = true;
                    break;
                }
            }
        }

        if (collideX) {
            // ★バグ修正: X方向も境界クランプを追加（Y方向と同様）
            if (bounds) {
                if (entity.x < bounds.left) entity.x = bounds.left;
                if (entity.x + entity.w > bounds.right) entity.x = bounds.right - entity.w;
            }

            // Clamping 適用後もまだ衝突している場合（壁など）のみ oldX に戻す
            // すでに境界クランプをした場合は oldX に戻すとまた境界外に出る可能性があるため。
            const atBoundsX = (bounds && (entity.x === bounds.left || entity.x === bounds.right - entity.w));
            if (!atBoundsX) {
                entity.x = oldX;
            }

            entity.vx = 0; // 壁に押し込まれないようvxをリセット
            result.collidedX = true;
        }

        // 2. Vertical Movement
        entity.y += entity.vy;
        let collideY = false;

        // World Bounds (Y)
        if (bounds) {
            if (entity.y < bounds.top || entity.y + entity.h > bounds.bottom) collideY = true;
        }

        // Platforms (Y)
        if (!collideY && platforms) {
            for (const wall of platforms) {
                if (Physics.checkAABB(entity, wall)) {
                    collideY = true;
                    break;
                }
            }
        }

        if (collideY) {
            // Clamp to bounds if collided with World Bounds
            if (bounds) {
                if (entity.y < bounds.top) entity.y = bounds.top;
                if (entity.y + entity.h > bounds.bottom) entity.y = bounds.bottom - entity.h;
            }
            // Platform clamp is harder without knowing which side, but usually handled by AABB resolution libraries.
            // For this simple game, we rely on bounds mostly.
            // If hitting a platform, reverting to oldY is usually safer unless we check direction.
            // But if we are stuck, we might need to eject.
            // For now, Bounds Clamping is the critical fix for "Stuck at bottom".

            // If we didn't clamp (platform collision), revert.
            // Check if we start inside bounds though?
            // Let's safe revert if we aren't at bounds limits.
            const atBounds = (bounds && (entity.y === bounds.top || entity.y === bounds.bottom - entity.h));

            if (!atBounds) {
                // Simple Revert for objects
                entity.y = oldY;
            }

            result.collidedY = true;
            entity.vy = 0;
        }

        return result;
    }

    /**
     * Simple AABB Collision Check
     */
    static checkAABB(a, b) {
        return (a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y);
    }

    /**
     * Get distance between two points
     */
    static dist(x1, y1, x2, y2) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

window.Physics = Physics;
