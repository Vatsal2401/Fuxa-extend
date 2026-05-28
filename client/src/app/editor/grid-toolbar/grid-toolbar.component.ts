import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { EditorGridService } from '../../_services/editor-grid.service';

/**
 * Floating bottom-right toolbar over the canvas.
 *
 *   ┌────────────────────────────────────────┐
 *   │ ◻ grid_on │ ⤢ snap │ 20px ▾  │
 *   └────────────────────────────────────────┘
 *
 * Subscribes to EditorGridService; clicks update the service which writes
 * through to svgCanvas.curConfig. Hidden under display:none until the lib
 * is initialised (avoids a flash before svgCanvas exists).
 */
@Component({
    selector: 'app-grid-toolbar',
    template: `
        <div class="grid-toolbar">
            <button class="gt-btn"
                    [class.gt-btn--on]="showGrid"
                    [appTooltip]="(showGrid ? 'editor.grid-hide' : 'editor.grid-show') | translate"
                    appTooltipShortcut="G"
                    appTooltipPlacement="above"
                    (click)="onToggleGrid()">
                <mat-icon>{{ showGrid ? 'grid_on' : 'grid_off' }}</mat-icon>
            </button>

            <button class="gt-btn"
                    [class.gt-btn--on]="snap"
                    [appTooltip]="(snap ? 'editor.snap-off' : 'editor.snap-on') | translate"
                    appTooltipShortcut="S"
                    appTooltipPlacement="above"
                    (click)="onToggleSnap()">
                <mat-icon>{{ snap ? 'compress' : 'open_with' }}</mat-icon>
            </button>

            <div class="gt-divider"></div>

            <button class="gt-btn gt-btn--size"
                    [appTooltip]="'editor.grid-size' | translate"
                    appTooltipPlacement="above"
                    [matMenuTriggerFor]="sizeMenu">
                {{ gridSize }}<span class="gt-unit">px</span>
                <mat-icon class="gt-caret">expand_more</mat-icon>
            </button>
            <mat-menu #sizeMenu="matMenu" class="grid-size-menu" xPosition="before" yPosition="above">
                <button mat-menu-item *ngFor="let s of sizes" (click)="onSetSize(s)">
                    <span [class.is-selected]="s === gridSize">{{ s }}px</span>
                </button>
            </mat-menu>
        </div>
    `,
    styles: [`
        :host { display: contents; }
        .grid-toolbar {
            position: absolute;
            right: 18px;
            bottom: 64px;
            z-index: 20;
            display: inline-flex;
            align-items: center;
            gap: 2px;
            padding: 4px;
            border-radius: 999px;
            background: var(--ds-surface);
            border: 1px solid var(--ds-border);
            box-shadow: var(--ds-shadow-md);
            backdrop-filter: blur(14px) saturate(125%);
            -webkit-backdrop-filter: blur(14px) saturate(125%);
            color: var(--ds-text);
            user-select: none;
        }
        .gt-btn {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 32px;
            height: 32px;
            padding: 0 8px;
            border-radius: 999px;
            border: 1px solid transparent;
            background: transparent;
            color: var(--ds-text);
            font: 600 12px/1 var(--ds-font);
            letter-spacing: .02em;
            cursor: pointer;
            transition: background var(--ds-dur-fast) var(--ds-ease),
                        color var(--ds-dur-fast) var(--ds-ease),
                        border-color var(--ds-dur-fast) var(--ds-ease);
        }
        .gt-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
        .gt-btn:hover { background: var(--ds-hover); color: var(--ds-brand); }
        .gt-btn--on   { background: rgba(var(--ds-brand-rgb), .14); color: var(--ds-brand); border-color: rgba(var(--ds-brand-rgb), .32); }
        .gt-btn:focus-visible { outline: none; box-shadow: var(--ds-focus-ring); }
        .gt-divider { width: 1px; height: 18px; background: var(--ds-border); margin: 0 2px; }
        .gt-btn--size { padding-right: 4px; gap: 2px; }
        .gt-unit { opacity: .65; margin-right: 2px; }
        .gt-caret { font-size: 16px !important; width: 16px !important; height: 16px !important; opacity: .7; }
    `],
})
export class GridToolbarComponent implements OnInit, OnDestroy {

    readonly sizes = EditorGridService.SIZES;
    ready = false;          // shown only after the lib has booted
    showGrid = true;
    snap = true;
    gridSize = 20;
    private subs: Subscription[] = [];
    private libCheckTimer: any = null;

    constructor(private grid: EditorGridService, private cdr: ChangeDetectorRef) {}

    ngOnInit(): void {
        this.subs.push(this.grid.showGrid$.subscribe(v => { this.showGrid = v; }));
        this.subs.push(this.grid.snap$.subscribe(v     => { this.snap = v; }));
        this.subs.push(this.grid.gridSize$.subscribe(v => { this.gridSize = v; }));
        // Wait for the lib to be ready before showing — eliminates a flash where
        // the toolbar appears before svgCanvas exists and toggles would no-op.
        this.waitForLib();
    }

    ngOnDestroy(): void {
        this.subs.forEach(s => s.unsubscribe());
        clearInterval(this.libCheckTimer);
    }

    onToggleGrid(): void { this.grid.setShowGrid(!this.showGrid); }
    onToggleSnap(): void { this.grid.setSnap(!this.snap); }
    onSetSize(n: number): void { this.grid.setGridSize(n); }

    private waitForLib(): void {
        const check = () => {
            if ((window as any)?.svgCanvas?.curConfig) {
                this.ready = true;
                this.grid.applyCurrent();
                clearInterval(this.libCheckTimer);
            }
        };
        check();
        if (!this.ready) { this.libCheckTimer = setInterval(check, 200); }
    }
}
