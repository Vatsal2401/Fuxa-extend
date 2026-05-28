import { Injectable } from '@angular/core';
import { WindowRef } from '../_helpers/windowref';

/**
 * Bridges Angular CDK drag-drop events to the external svg-editor lib for
 * programmatic shape placement. Owns the coordinate math + edge-case guards.
 *
 * Coordinate strategy:
 *   We use the SVG element's own `getScreenCTM().inverse()` to map screen-px
 *   to SVG user-units. This single matrix collapses zoom, pan, viewBox scaling,
 *   browser zoom, and devicePixelRatio in one transform — avoiding the
 *   "works on my screen" bugs caused by manual getZoom()/getBoundingClientRect()
 *   arithmetic.
 */
export interface DropShape {
    name: string;          // shape mode id (passed to svgEditor.clickToSetMode)
    ico?: string;
    content?: any[];
}

@Injectable({ providedIn: 'root' })
export class EditorDropService {

    /** In-flight guard prevents double placement on rapid successive drops. */
    private placing = false;

    constructor(private winRef: WindowRef) {}

    /** Feature-detect lib API. Components should fall back to click-to-place if false. */
    isReady(): boolean {
        const w = this.winRef.nativeWindow;
        return !!(w?.svgEditor?.clickToSetMode && w?.svgCanvas);
    }

    /** Locate the live SVG root the lib draws into. */
    private getSvgRoot(): SVGSVGElement | null {
        const byId = document.getElementById('svgroot') as unknown as SVGSVGElement | null;
        if (byId && (byId as any).getScreenCTM) { return byId; }
        // svg-editor sometimes uses #svgcontent as root; fall back to first SVG inside #svgcanvas
        const fallback = document.querySelector('#svgcanvas svg') as SVGSVGElement | null;
        return fallback;
    }

    /** Screen-px point → SVG user-units. The robust path: matrix transform. */
    private screenToSvg(svgEl: SVGSVGElement, x: number, y: number): DOMPoint | null {
        if (!svgEl?.getScreenCTM) { return null; }
        const ctm = svgEl.getScreenCTM();
        if (!ctm) { return null; }
        const pt = svgEl.createSVGPoint();
        pt.x = x; pt.y = y;
        try { return pt.matrixTransform(ctm.inverse()); }
        catch { return null; }
    }

    /** True if the screen point lies within the visible canvas area. */
    private isInsideCanvas(screenX: number, screenY: number): boolean {
        const workarea = document.getElementById('workarea');
        if (!workarea) { return false; }
        const r = workarea.getBoundingClientRect();
        return screenX >= r.left && screenX <= r.right && screenY >= r.top && screenY <= r.bottom;
    }

    /**
     * Place a shape on the canvas at the given screen-coords.
     * Returns true if placement was attempted; false on validity/feature-detect failure.
     */
    placeAtScreenPoint(shape: DropShape, screenX: number, screenY: number): boolean {
        if (this.placing) { return false; }              // debounce
        if (!this.isReady()) { return false; }            // feature-detect
        if (!this.isInsideCanvas(screenX, screenY)) { return false; } // outside the canvas — silent cancel

        const svgRoot = this.getSvgRoot();
        if (!svgRoot) { return false; }

        const pt = this.screenToSvg(svgRoot, screenX, screenY);
        if (!pt) { return false; }

        // Clamp to viewBox so shapes can't land at negative / out-of-canvas coords.
        const vb = (svgRoot as any).viewBox?.baseVal;
        const maxW = vb?.width  || svgRoot.clientWidth  || 1024;
        const maxH = vb?.height || svgRoot.clientHeight || 768;
        if (pt.x < 0 || pt.y < 0 || pt.x > maxW || pt.y > maxH) {
            return false;  // outside viewBox
        }

        this.placing = true;
        const w = this.winRef.nativeWindow;
        try {
            // Enter draw-mode for this shape, then dispatch a synthetic click on the canvas
            // at the screen coords. The lib's own mouse handler does the actual placement,
            // pushes onto the undo stack, auto-selects, and marks dirty — all for free.
            w.svgEditor.clickToSetMode(shape.name);

            // Size-based shapes (rect/circle/ellipse/custom) are drawn by the lib via
            // mousedown → drag → mouseup. Firing down+up at ONE point makes a 0-size shape
            // (or leaves the editor waiting for a second click). So we simulate a small
            // drag: down at the drop point, move by a default size, then up — the shape is
            // placed immediately at the drop location with a sensible default size.
            const SIZE = 60;
            const fire = (type: 'mousedown' | 'mousemove' | 'mouseup', px: number, py: number) => {
                const ev = new MouseEvent(type, {
                    bubbles: true, cancelable: true, view: window,
                    clientX: px, clientY: py, button: 0, buttons: type === 'mouseup' ? 0 : 1,
                });
                svgRoot.dispatchEvent(ev);
            };
            fire('mousedown', screenX, screenY);
            fire('mousemove', screenX + SIZE, screenY + SIZE);
            fire('mouseup',   screenX + SIZE, screenY + SIZE);

            // Reset mode so subsequent plain canvas clicks don't auto-place another shape.
            w.svgEditor.clickToSetMode('select');

            // UX: drop confirmation pulse — a brand-blue ring expanding+fading at the
            // exact drop point so the user sees where the shape landed.
            this.emitDropPulse(screenX, screenY);
        } catch (e) {
            console.warn('[EditorDropService] placement failed', e);
        } finally {
            setTimeout(() => { this.placing = false; }, 100);
        }
        return true;
    }

    /** Visible confirmation: ring expands and fades at the drop point. */
    private emitDropPulse(x: number, y: number): void {
        const pulse = document.createElement('div');
        pulse.className = 'ds-drop-pulse';
        pulse.style.left = (x - 16) + 'px';
        pulse.style.top  = (y - 16) + 'px';
        document.body.appendChild(pulse);
        // GC after the animation finishes (kept short — 600ms)
        setTimeout(() => { pulse.parentNode?.removeChild(pulse); }, 700);
    }
}
