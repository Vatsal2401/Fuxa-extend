import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Owns grid + snap state for the editor. Talks to the external svg-editor
 * lib (svgCanvas.curConfig) — the math is already implemented in the lib,
 * we just expose a clean Angular API + persistence + Alt-hold semantics.
 *
 * Storage: localStorage key `fuxa.grid` → { show, snap, size }.
 */
@Injectable({ providedIn: 'root' })
export class EditorGridService {

    static readonly SIZES = [10, 20, 40, 80] as const;
    private static readonly STORAGE_KEY = 'fuxa.grid';

    readonly showGrid$ = new BehaviorSubject<boolean>(true);
    readonly snap$     = new BehaviorSubject<boolean>(true);
    readonly gridSize$ = new BehaviorSubject<number>(20);

    /** Non-null when Alt is held — temporarily overrides snap$ value. */
    private snapHoldOverride: boolean | null = null;

    constructor() { this.loadFromStorage(); }

    /** Push current state into the lib. Idempotent — safe to call repeatedly.
     *  Also installs our token-driven SVG <pattern> grid the first time it
     *  finds #canvasGrid, replacing the lib's <image>-based grid which is
     *  generated once from a hardcoded color and never re-rendered. */
    applyCurrent(): void {
        const cfg = this.getCfg();
        if (!cfg) { return; }
        cfg.showGrid     = this.showGrid$.value;
        cfg.gridSnapping = this.effectiveSnap();
        cfg.snappingStep = this.gridSize$.value;
        this.installCustomGridOnce();
        this.repaintGridPattern();
        this.paintGrid(this.showGrid$.value);
    }

    setShowGrid(b: boolean): void {
        this.showGrid$.next(b);
        const cfg = this.getCfg();
        if (cfg) { cfg.showGrid = b; }
        this.installCustomGridOnce();
        this.paintGrid(b);
        this.save();
    }

    setSnap(b: boolean): void {
        this.snap$.next(b);
        const cfg = this.getCfg();
        if (cfg) { cfg.gridSnapping = this.effectiveSnap(); }
        this.save();
    }

    setGridSize(n: number): void {
        if (!(EditorGridService.SIZES as readonly number[]).includes(n)) { return; }
        this.gridSize$.next(n);
        const cfg = this.getCfg();
        if (cfg) { cfg.snappingStep = n; }
        // Repaint our custom <pattern> immediately — the lib never re-renders its
        // own grid image after init, but we own a pattern in #canvasGrid we can
        // re-tune live.
        this.installCustomGridOnce();
        this.repaintGridPattern();
        this.save();
    }

    /** Hold-Alt temporarily disables snap; release restores prior value. */
    setSnapHold(active: boolean): void {
        this.snapHoldOverride = active ? false : null;
        const cfg = this.getCfg();
        if (cfg) { cfg.gridSnapping = this.effectiveSnap(); }
    }

    isSnapEffective(): boolean { return this.effectiveSnap(); }
    getGridSize(): number      { return this.gridSize$.value; }

    /** Programmatic move (e.g. arrow-key nudge, soft-snap correction). undoable=false. */
    nudge(dx: number, dy: number): void {
        if (!dx && !dy) { return; }
        const w = window as any;
        w?.svgCanvas?.moveSelectedElements?.(dx, dy, false);
    }

    /* ============================================================ */
    /* internal                                                     */
    /* ============================================================ */

    private effectiveSnap(): boolean {
        return this.snapHoldOverride !== null ? this.snapHoldOverride : this.snap$.value;
    }

    private getCfg(): any | null {
        return (window as any)?.svgCanvas?.curConfig ?? null;
    }

    /** Toggle our custom grid overlay's visibility.
     *  The lib's #canvasGrid is permanently hidden (it never re-renders its
     *  baked image after init). Our overlay lives ON TOP of user content so
     *  the grid is visible even when shapes have opaque fills (Figma-style). */
    private paintGrid(show: boolean): void {
        const ours = document.getElementById(EditorGridService.OVERLAY_ID);
        if (ours) { (ours as unknown as SVGElement).style.display = show ? '' : 'none'; }
        const lib = document.getElementById('canvasGrid');
        if (lib) { (lib as HTMLElement).style.display = 'none'; }   // always hide the lib's
    }

    private static readonly OVERLAY_ID = 'ds-grid-overlay';
    private static readonly PATTERN_ID = 'ds-grid-pattern';
    private static readonly RECT_ID    = 'ds-grid-rect';
    private static readonly SVG_NS     = 'http://www.w3.org/2000/svg';

    /**
     * Inject a token-driven SVG <pattern> grid as the last drawable layer of
     * #svgroot (after #svgcontent, before #selectorParentGroup). This puts
     * the grid ON TOP of user shapes so an opaque fill in a view doesn't
     * hide it — the standard "guide overlay" UX from Figma / VS Code / etc.
     *
     * Persistence-safe: it lives outside #svgcontent, so the lib's serialise
     * (which only walks #svgcontent) won't save the grid into project XML.
     * Idempotent: re-running after install is a no-op.
     */
    private installCustomGridOnce(): void {
        const root = document.getElementById('svgroot');
        if (!root) { return; }
        if (root.querySelector(`#${EditorGridService.OVERLAY_ID}`)) { return; }

        const NS = EditorGridService.SVG_NS;
        const size = String(this.gridSize$.value);

        // The lib's own grid is unreliable post-init — disable it and own this
        const libGrid = document.getElementById('canvasGrid');
        if (libGrid) { (libGrid as HTMLElement).style.display = 'none'; }

        const g = document.createElementNS(NS, 'g');
        g.setAttribute('id', EditorGridService.OVERLAY_ID);
        g.setAttribute('pointer-events', 'none');
        g.setAttribute('opacity', '0.5');
        g.style.display = this.showGrid$.value ? '' : 'none';

        const defs = document.createElementNS(NS, 'defs');
        const pattern = document.createElementNS(NS, 'pattern');
        pattern.setAttribute('id', EditorGridService.PATTERN_ID);
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');
        pattern.setAttribute('width', size);
        pattern.setAttribute('height', size);
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', `M ${size} 0 L 0 0 0 ${size}`);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'var(--ds-canvas-grid, rgba(76,159,255,.35))');
        path.setAttribute('stroke-width', '1');
        path.setAttribute('shape-rendering', 'crispEdges');
        pattern.appendChild(path);
        defs.appendChild(pattern);
        g.appendChild(defs);

        // Use viewBox dimensions so the rect covers the whole canvas — fall
        // back to large values so the grid covers panned regions too.
        const vb = (root as any).viewBox?.baseVal;
        const w = vb?.width  || 4000;
        const h = vb?.height || 4000;
        const rect = document.createElementNS(NS, 'rect');
        rect.setAttribute('id', EditorGridService.RECT_ID);
        rect.setAttribute('width',  String(w));
        rect.setAttribute('height', String(h));
        rect.setAttribute('x', '0');
        rect.setAttribute('y', '0');
        rect.setAttribute('fill', `url(#${EditorGridService.PATTERN_ID})`);
        g.appendChild(rect);

        // Paint last so it overlays user content — but BEFORE the lib's
        // selector handles group (so resize/rotate handles stay on top).
        const selectorGroup = root.querySelector('#selectorParentGroup');
        if (selectorGroup) {
            root.insertBefore(g, selectorGroup);
        } else {
            root.appendChild(g);
        }
    }

    /** Re-tune our pattern's cell dimensions to the current gridSize. */
    private repaintGridPattern(): void {
        const pattern = document.getElementById(EditorGridService.PATTERN_ID);
        if (!pattern) { return; }
        const size = String(this.gridSize$.value);
        pattern.setAttribute('width', size);
        pattern.setAttribute('height', size);
        const path = pattern.querySelector('path');
        path?.setAttribute('d', `M ${size} 0 L 0 0 0 ${size}`);
    }

    private loadFromStorage(): void {
        try {
            const raw = localStorage.getItem(EditorGridService.STORAGE_KEY);
            if (!raw) { return; }
            const s = JSON.parse(raw);
            if (typeof s?.show === 'boolean') { this.showGrid$.next(s.show); }
            if (typeof s?.snap === 'boolean') { this.snap$.next(s.snap); }
            if (typeof s?.size === 'number' && (EditorGridService.SIZES as readonly number[]).includes(s.size)) {
                this.gridSize$.next(s.size);
            }
        } catch { /* corrupted prefs — fall back to defaults */ }
    }

    private save(): void {
        try {
            localStorage.setItem(EditorGridService.STORAGE_KEY, JSON.stringify({
                show: this.showGrid$.value,
                snap: this.snap$.value,
                size: this.gridSize$.value,
            }));
        } catch { /* private mode etc. */ }
    }
}
