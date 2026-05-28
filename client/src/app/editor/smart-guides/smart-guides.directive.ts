import { Directive, OnDestroy, OnInit } from '@angular/core';
import { EditorGridService } from '../../_services/editor-grid.service';

/**
 * Smart alignment guides — Figma-style visual aids during shape drag.
 *
 * Attached once near the editor wrapper. Self-locates the canvas by id once
 * the svg-editor lib has bootstrapped, then:
 *
 *   1. On the canvas' mousedown:
 *      - If a single element is selected and the click hits a shape (not a
 *        handle/empty area), enter drag mode.
 *      - Snapshot the bounding-box of every OTHER top-level shape ONCE so we
 *        don't query the DOM every frame.
 *
 *   2. On document mousemove while dragging (rAF-throttled):
 *      - Read the selected element's bbox in canvas user-units.
 *      - For each of the 6 reference values (left/right/centerX/top/bottom/
 *        centerY), find any cached neighbour whose corresponding value is
 *        within TOLERANCE → record a guide line.
 *      - Draw / move up to 2 guide lines per axis on a transparent SVG
 *        overlay (lines are reused, never recreated, so GC stays quiet).
 *
 *   3. On mouseup:
 *      - Hide the overlay.
 *      - If snap-to-guide is on AND a sub-tolerance delta was detected,
 *        nudge the selected element by the smallest delta per axis (via
 *        svgCanvas.moveSelectedElements with undoable=false so we don't
 *        pollute the undo stack).
 *
 *  Holding ALT during drag bypasses the snap correction (guides still show).
 */
interface BBox { l: number; r: number; cx: number; t: number; b: number; cy: number; }
interface GuideHit { axis: 'x' | 'y'; delta: number; pos: number; from: number; to: number; }

@Directive({
    selector: '[appSmartGuides]',
    standalone: false,
})
export class SmartGuidesDirective implements OnInit, OnDestroy {

    /** Match tolerance in SVG user-units. ~4px at 100% zoom is the sweet spot. */
    private static readonly TOL = 4;
    /** Max number of guides drawn per axis (left+right, or top+bottom). */
    private static readonly MAX_PER_AXIS = 2;

    private overlaySvg?: SVGSVGElement;
    private hLines: SVGLineElement[] = [];
    private vLines: SVGLineElement[] = [];

    private dragging = false;
    private selected: SVGGraphicsElement | null = null;
    private others: { el: SVGGraphicsElement; box: BBox }[] = [];
    private rafScheduled = false;
    private lastClientX = 0;
    private lastClientY = 0;
    private finalSnap = { dx: 0, dy: 0 };

    private libCheckTimer: any = null;
    private onMouseDown = (e: MouseEvent) => this.handleMouseDown(e);
    private onMouseMove = (e: MouseEvent) => this.handleMouseMove(e);
    private onMouseUp   = (e: MouseEvent) => this.handleMouseUp(e);

    constructor(private grid: EditorGridService) {}

    ngOnInit(): void {
        // The svg-editor lib injects #svgcanvas asynchronously — poll until it exists.
        const tryAttach = () => {
            const canvas = document.getElementById('svgcanvas');
            const root = document.getElementById('svgroot') as unknown as SVGSVGElement | null;
            if (canvas && root) {
                clearInterval(this.libCheckTimer);
                this.attach(canvas, root);
            }
        };
        tryAttach();
        if (!this.overlaySvg) {
            this.libCheckTimer = setInterval(tryAttach, 200);
        }
    }

    ngOnDestroy(): void {
        clearInterval(this.libCheckTimer);
        const c = document.getElementById('svgcanvas');
        c?.removeEventListener('mousedown', this.onMouseDown, true);
        document.removeEventListener('mousemove', this.onMouseMove, true);
        document.removeEventListener('mouseup', this.onMouseUp, true);
        this.overlaySvg?.remove();
    }

    /* ============================================================ */
    /* Setup                                                        */
    /* ============================================================ */

    private attach(canvas: HTMLElement, _root: SVGSVGElement): void {
        const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        overlay.classList.add('smart-guides-overlay');
        Object.assign(overlay.style, {
            position: 'absolute', inset: '0', width: '100%', height: '100%',
            pointerEvents: 'none', overflow: 'visible',
            zIndex: '5', opacity: '0',
            transition: 'opacity 80ms var(--ds-ease, cubic-bezier(.4,0,.2,1))',
        } as CSSStyleDeclaration);
        // Pre-create line elements (reused — no per-frame allocations)
        for (let i = 0; i < SmartGuidesDirective.MAX_PER_AXIS; i++) {
            this.hLines.push(this.makeLine(overlay));
            this.vLines.push(this.makeLine(overlay));
        }
        // Canvas position must be relative for absolute overlay; ensure it
        if (getComputedStyle(canvas).position === 'static') {
            canvas.style.position = 'relative';
        }
        canvas.appendChild(overlay);
        this.overlaySvg = overlay;

        canvas.addEventListener('mousedown', this.onMouseDown, true);
        document.addEventListener('mousemove', this.onMouseMove, true);
        document.addEventListener('mouseup', this.onMouseUp, true);
    }

    private makeLine(parent: SVGSVGElement): SVGLineElement {
        const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        ln.setAttribute('stroke', 'var(--ds-brand, #4c9fff)');
        ln.setAttribute('stroke-width', '1');
        ln.setAttribute('vector-effect', 'non-scaling-stroke');
        ln.setAttribute('opacity', '0');
        ln.setAttribute('stroke-dasharray', '4 3');
        parent.appendChild(ln);
        return ln;
    }

    /* ============================================================ */
    /* Drag lifecycle                                               */
    /* ============================================================ */

    private handleMouseDown(e: MouseEvent): void {
        if (e.button !== 0) { return; }
        const w = window as any;
        const sel = w?.svgCanvas?.getSelectedElements?.() as SVGGraphicsElement[] | undefined;
        if (!sel || sel.length !== 1 || !sel[0]) { return; }
        // Only treat as a drag start if the click landed on the selected shape itself
        const target = e.target as Element;
        if (!sel[0].contains(target) && target !== sel[0]) {
            // Could still be a transform handle drag — skip; we only show guides for shape moves.
            return;
        }
        this.selected = sel[0];
        this.snapshotOthers(this.selected);
        this.dragging = true;
        this.lastClientX = e.clientX;
        this.lastClientY = e.clientY;
        this.finalSnap = { dx: 0, dy: 0 };
    }

    private handleMouseMove(e: MouseEvent): void {
        if (!this.dragging) { return; }
        this.lastClientX = e.clientX;
        this.lastClientY = e.clientY;
        if (this.rafScheduled) { return; }
        this.rafScheduled = true;
        requestAnimationFrame(() => {
            this.rafScheduled = false;
            this.recompute();
        });
    }

    private handleMouseUp(_e: MouseEvent): void {
        if (!this.dragging) { return; }
        this.dragging = false;
        // Soft-snap correction (skip if Alt is being held — service tracks this).
        if (this.grid.isSnapEffective() && (this.finalSnap.dx || this.finalSnap.dy)) {
            // Tiny delta only — anything larger than TOL is not a guide-snap
            const dx = Math.abs(this.finalSnap.dx) <= SmartGuidesDirective.TOL ? this.finalSnap.dx : 0;
            const dy = Math.abs(this.finalSnap.dy) <= SmartGuidesDirective.TOL ? this.finalSnap.dy : 0;
            this.grid.nudge(dx, dy);
        }
        this.hideOverlay();
        this.selected = null;
        this.others = [];
        this.finalSnap = { dx: 0, dy: 0 };
    }

    /* ============================================================ */
    /* Alignment computation                                        */
    /* ============================================================ */

    private snapshotOthers(moving: SVGGraphicsElement): void {
        this.others = [];
        // svg-editor stores user shapes as children of #svgcontent (or its first <g>).
        const root = document.getElementById('svgcontent');
        if (!root) { return; }
        const candidates = root.querySelectorAll<SVGGraphicsElement>('g > *, > *');
        candidates.forEach(el => {
            if (el === moving) { return; }
            // Skip definitions, the grid, decorations
            const tag = el.tagName.toLowerCase();
            if (tag === 'defs' || tag === 'title' || tag === 'desc') { return; }
            if (el.id === 'canvasGrid' || el.id === 'selectorParentGroup') { return; }
            const box = this.bboxOf(el);
            if (box) { this.others.push({ el, box }); }
        });
    }

    private bboxOf(el: SVGGraphicsElement): BBox | null {
        try {
            const b = el.getBBox();
            if (!b || (b.width === 0 && b.height === 0)) { return null; }
            return {
                l: b.x, r: b.x + b.width, cx: b.x + b.width / 2,
                t: b.y, b: b.y + b.height, cy: b.y + b.height / 2,
            };
        } catch { return null; }
    }

    private recompute(): void {
        if (!this.selected || !this.overlaySvg) { return; }
        const m = this.bboxOf(this.selected);
        if (!m) { return; }

        // Find best matches per reference value. We track up to MAX_PER_AXIS hits
        // per axis (so e.g. left + right can both show at once).
        const xHits: GuideHit[] = [];
        const yHits: GuideHit[] = [];

        for (const o of this.others) {
            const ob = o.box;
            // Vertical guides — align x values; the guide is vertical, spanning y range
            this.tryHit('x', m.l, ob.l, m, ob, xHits);
            this.tryHit('x', m.l, ob.cx, m, ob, xHits);
            this.tryHit('x', m.l, ob.r, m, ob, xHits);
            this.tryHit('x', m.cx, ob.l, m, ob, xHits);
            this.tryHit('x', m.cx, ob.cx, m, ob, xHits);
            this.tryHit('x', m.cx, ob.r, m, ob, xHits);
            this.tryHit('x', m.r, ob.l, m, ob, xHits);
            this.tryHit('x', m.r, ob.cx, m, ob, xHits);
            this.tryHit('x', m.r, ob.r, m, ob, xHits);
            // Horizontal guides — align y values
            this.tryHit('y', m.t, ob.t, m, ob, yHits);
            this.tryHit('y', m.t, ob.cy, m, ob, yHits);
            this.tryHit('y', m.t, ob.b, m, ob, yHits);
            this.tryHit('y', m.cy, ob.t, m, ob, yHits);
            this.tryHit('y', m.cy, ob.cy, m, ob, yHits);
            this.tryHit('y', m.cy, ob.b, m, ob, yHits);
            this.tryHit('y', m.b, ob.t, m, ob, yHits);
            this.tryHit('y', m.b, ob.cy, m, ob, yHits);
            this.tryHit('y', m.b, ob.b, m, ob, yHits);
        }

        // Pick the smallest delta per axis for the soft-snap correction on mouseup
        this.finalSnap.dx = this.pickBest(xHits);
        this.finalSnap.dy = this.pickBest(yHits);

        // Draw / update guide lines. Reuse the pre-allocated <line> nodes.
        this.draw(xHits.slice(0, SmartGuidesDirective.MAX_PER_AXIS), this.vLines, 'v');
        this.draw(yHits.slice(0, SmartGuidesDirective.MAX_PER_AXIS), this.hLines, 'h');

        const anyHit = xHits.length > 0 || yHits.length > 0;
        this.overlaySvg.style.opacity = anyHit ? '1' : '0';
    }

    private tryHit(axis: 'x' | 'y', mv: number, ov: number, m: BBox, ob: BBox, hits: GuideHit[]): void {
        const delta = ov - mv;
        if (Math.abs(delta) > SmartGuidesDirective.TOL) { return; }
        // For an X-axis guide, the line is vertical at x=ov and spans the y-extent
        // covering BOTH shapes (so the line visually connects them).
        if (axis === 'x') {
            hits.push({
                axis, delta, pos: ov,
                from: Math.min(m.t, ob.t),
                to:   Math.max(m.b, ob.b),
            });
        } else {
            hits.push({
                axis, delta, pos: ov,
                from: Math.min(m.l, ob.l),
                to:   Math.max(m.r, ob.r),
            });
        }
    }

    private pickBest(hits: GuideHit[]): number {
        if (!hits.length) { return 0; }
        let best = hits[0];
        for (const h of hits) { if (Math.abs(h.delta) < Math.abs(best.delta)) { best = h; } }
        return best.delta;
    }

    /* ============================================================ */
    /* Rendering                                                    */
    /* ============================================================ */

    private draw(hits: GuideHit[], lines: SVGLineElement[], orientation: 'v' | 'h'): void {
        // First, hide all lines in this set
        for (const ln of lines) { ln.setAttribute('opacity', '0'); }

        // Convert canvas user-units → overlay px. The overlay is positioned over
        // #svgcanvas with width:100%/height:100%. We need an svgroot → canvas
        // matrix to translate user units to overlay pixels.
        const root = document.getElementById('svgroot') as unknown as SVGSVGElement | null;
        if (!root) { return; }
        const ctm = root.getScreenCTM();
        const canvas = this.overlaySvg!.parentElement!.getBoundingClientRect();
        if (!ctm) { return; }

        // Map a user-unit point to overlay-local pixels.
        const toOverlay = (ux: number, uy: number): { x: number, y: number } => {
            const pt = root.createSVGPoint(); pt.x = ux; pt.y = uy;
            const screen = pt.matrixTransform(ctm);
            return { x: screen.x - canvas.left, y: screen.y - canvas.top };
        };

        for (let i = 0; i < Math.min(hits.length, lines.length); i++) {
            const h = hits[i];
            const ln = lines[i];
            if (orientation === 'v') {
                const a = toOverlay(h.pos, h.from);
                const b = toOverlay(h.pos, h.to);
                ln.setAttribute('x1', String(a.x));
                ln.setAttribute('y1', String(a.y));
                ln.setAttribute('x2', String(b.x));
                ln.setAttribute('y2', String(b.y));
            } else {
                const a = toOverlay(h.from, h.pos);
                const b = toOverlay(h.to,   h.pos);
                ln.setAttribute('x1', String(a.x));
                ln.setAttribute('y1', String(a.y));
                ln.setAttribute('x2', String(b.x));
                ln.setAttribute('y2', String(b.y));
            }
            ln.setAttribute('opacity', '0.85');
        }
    }

    private hideOverlay(): void {
        if (!this.overlaySvg) { return; }
        for (const ln of this.vLines) { ln.setAttribute('opacity', '0'); }
        for (const ln of this.hLines) { ln.setAttribute('opacity', '0'); }
        this.overlaySvg.style.opacity = '0';
    }
}
