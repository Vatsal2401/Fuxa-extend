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

    /** Push current state into the lib. Idempotent — safe to call repeatedly. */
    applyCurrent(): void {
        const cfg = this.getCfg();
        if (!cfg) { return; }
        cfg.showGrid     = this.showGrid$.value;
        cfg.gridSnapping = this.effectiveSnap();
        cfg.snappingStep = this.gridSize$.value;
        this.paintGrid(this.showGrid$.value);
    }

    setShowGrid(b: boolean): void {
        this.showGrid$.next(b);
        const cfg = this.getCfg();
        if (cfg) { cfg.showGrid = b; }
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
        if (cfg) {
            cfg.snappingStep = n;
            // The lib doesn't auto-rebuild the grid pattern when the step changes —
            // flip visibility off/on next tick to force a re-render.
            if (this.showGrid$.value) {
                this.paintGrid(false);
                setTimeout(() => this.paintGrid(true), 0);
            }
        }
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

    /** Toggle the lib's grid DOM directly — covers cases where the lib's own
     *  showGrid flag isn't honoured because the editor hasn't been re-rendered. */
    private paintGrid(show: boolean): void {
        const el = document.getElementById('canvasGrid');
        if (el) { (el as HTMLElement).style.display = show ? '' : 'none'; }
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
