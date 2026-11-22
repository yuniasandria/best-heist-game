// Keyboard + mouse input, polled once per frame by main.js.
// Keys are tracked by e.code so WASD and arrows both work; the mouse position
// is kept in canvas coordinates for the coin toss aim.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false, clicked: false, clickX: 0, clickY: 0 };
    this._pressed = new Set(); // edge-triggered keys, consumed by main.js
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this._pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
      this.mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const r = canvas.getBoundingClientRect();
      this.mouse.down = true;
      this.mouse.clicked = true;
      this.mouse.clickX = ((e.clientX - r.left) / r.width) * canvas.width;
      this.mouse.clickY = ((e.clientY - r.top) / r.height) * canvas.height;
    });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
  }

  down(...codes) { return codes.some((c) => this.keys.has(c)); }

  // True once, on the frame the key went down. main.js calls this every frame
  // for the keys it cares about so a press is never double-counted.
  pressed(code) {
    if (this._pressed.has(code)) { this._pressed.delete(code); return true; }
    return false;
  }

  consumeClick() {
    if (!this.mouse.clicked) return null;
    this.mouse.clicked = false;
    return { x: this.mouse.clickX, y: this.mouse.clickY };
  }

  // Movement vector from WASD / arrows, normalised.
  moveVector() {
    let x = 0, y = 0;
    if (this.down('KeyA', 'ArrowLeft')) x -= 1;
    if (this.down('KeyD', 'ArrowRight')) x += 1;
    if (this.down('KeyW', 'ArrowUp')) y -= 1;
    if (this.down('KeyS', 'ArrowDown')) y += 1;
    if (x === 0 && y === 0) return { x: 0, y: 0 };
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  }
}
