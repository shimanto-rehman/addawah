/**
 * Confetti Animation Library - Enhanced Version
 */

(function() {
  'use strict';

  // ============================================
  // CUSTOMIZATION: Edit these values
  // ============================================
  
  const COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B500', '#FF1744', '#76FF03', '#FF4081'
  ]; // Original colors preserved
  
  const PARTICLE_SIZE_MIN = 4;     // Smaller minimum size
  const PARTICLE_SIZE_MAX = 8;     // Smaller maximum size
  const GRAVITY = 0.4;              // Reduced gravity for more float time
  const DECAY = 0.94;               // Less decay = particles travel farther
  const LIFETIME_TICKS = 300;       // Longer lifetime to see particles across screen
  const CANVAS_Z_INDEX = '2147483647';
  
  // ============================================

  class ConfettiParticle {
    constructor(x, y, angle, velocity, spread) {
      this.x = x;
      this.y = y;
      
      // Smaller random size
      this.size = Math.random() * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN) + PARTICLE_SIZE_MIN;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      
      // Shape: 50/50 circle or square
      this.shape = Math.random() > 0.5 ? 'square' : 'circle';
      
      // Calculate velocity with better spread coverage
      const spreadRad = spread * Math.PI / 180;
      const angleRad = angle * Math.PI / 180;
      const randomSpread = (Math.random() - 0.5) * spreadRad;
      const finalAngle = angleRad + randomSpread;
      
      // More consistent velocity for better coverage
      const randomVelocity = velocity * (Math.random() * 0.4 + 0.7);
      
      this.velocityX = Math.cos(finalAngle) * randomVelocity;
      this.velocityY = -Math.sin(finalAngle) * randomVelocity;
      
      // Enhanced wobble for more natural movement
      this.wobble = Math.random() * 10;
      this.wobbleSpeed = Math.random() * 0.08 + 0.04;
      
      // Tilt angle for rotation
      this.tiltAngle = Math.random() * Math.PI * 2;
      this.tiltAngleIncrement = (Math.random() - 0.5) * 0.15;
      
      this.opacity = 1;
      this.ticks = 0;
      this.scalar = 1;
      this.ovalScalar = 0.6;
    }

    update() {
      this.ticks++;
      
      // Physics with reduced gravity and decay
      this.velocityY += GRAVITY;
      this.velocityX *= DECAY;
      this.velocityY *= DECAY;
      
      this.x += this.velocityX;
      this.y += this.velocityY;
      
      // Wobble and tilt
      this.wobble += this.wobbleSpeed;
      this.tiltAngle += this.tiltAngleIncrement;
      
      // Smoother fade at the end
      const progress = this.ticks / LIFETIME_TICKS;
      if (progress > 0.8) {
        this.opacity = 1 - ((progress - 0.8) / 0.2);
      } else {
        this.opacity = 1;
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, this.opacity));
      
      // Apply wobble position
      const wobbleX = this.x + Math.cos(this.wobble) * 8 * this.scalar;
      const wobbleY = this.y + Math.sin(this.wobble) * 8 * this.scalar;
      
      ctx.translate(wobbleX, wobbleY);
      ctx.rotate(this.tiltAngle);
      
      ctx.fillStyle = this.color;
      
      if (this.shape === 'circle') {
        // Draw oval/ellipse
        ctx.beginPath();
        ctx.ellipse(
          0, 0,
          this.size * this.ovalScalar,
          this.size * this.ovalScalar * 0.6,
          0, 0, Math.PI * 2
        );
        ctx.fill();
      } else {
        // Draw rectangle
        const w = this.size * this.scalar;
        const h = this.size * this.scalar * 0.5;
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }
      
      ctx.restore();
    }

    isDead() {
      return this.ticks >= LIFETIME_TICKS || this.opacity <= 0 || this.y > window.innerHeight + 100;
    }
  }

  class ConfettiManager {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.particles = [];
      this.animationId = null;
    }

    init() {
      if (this.canvas) return;
      
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'dawa-confetti-canvas';
      this.canvas.setAttribute('data-confetti', '');
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.zIndex = CANVAS_Z_INDEX;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      
      window.addEventListener('resize', () => {
        if (this.canvas) {
          this.canvas.width = window.innerWidth;
          this.canvas.height = window.innerHeight;
        }
      });
    }

    createParticles(options) {
      const defaults = {
        particleCount: 50,
        angle: 90,
        spread: 45,
        startVelocity: 25,
        origin: { x: 0.5, y: 0.6 }
      };
      
      const config = { ...defaults, ...options };
      
      const originX = window.innerWidth * config.origin.x;
      const originY = window.innerHeight * config.origin.y;
      
      for (let i = 0; i < config.particleCount; i++) {
        this.particles.push(new ConfettiParticle(
          originX, originY,
          config.angle,
          config.startVelocity,
          config.spread
        ));
      }
    }

    animate() {
      if (!this.canvas || !this.ctx) return;
      
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const particle = this.particles[i];
        particle.update();
        particle.draw(this.ctx);
        
        if (particle.isDead()) {
          this.particles.splice(i, 1);
        }
      }
      
      if (this.particles.length > 0) {
        this.animationId = requestAnimationFrame(() => this.animate());
      } else {
        this.cleanup();
      }
    }

    cleanup() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
        this.canvas = null;
        this.ctx = null;
      }
    }

    shoot(options) {
      this.init();
      this.createParticles(options);
      
      if (!this.animationId) {
        this.animate();
      }
    }
  }

  const manager = new ConfettiManager();

  window.confetti = function(options) {
    manager.shoot(options);
    return Promise.resolve();
  };

  window.confetti.reset = function() {
    manager.cleanup();
  };

})();

