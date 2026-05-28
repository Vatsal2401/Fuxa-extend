import { Directive, ElementRef, Input, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { EditorDropService } from '../_services/editor-drop.service';

/**
 * Unified drag-to-place directive for ALL palette items
 * (Shape, Proc.Eng, Animation, Controls, General).
 *
 * Uses NATIVE HTML5 drag — deliberately, NOT CDK:
 *   - CDK's free-drag (createDrag without a cdkDropList) MOVES the real element
 *     and renders no preview/placeholder → source vanishes + gets clipped.
 *   - HTML5 native drag never moves the source. We supply our own drag image
 *     (a thumbnail of the item's icon) via setDragImage. The drag image is
 *     painted by the OS/browser compositor, so it's never clipped by any
 *     CSS containing block (backdrop-filter/overflow/transform) — it's visible
 *     across the whole screen, including over the canvas.
 *
 * Usage:  <div ... [appPaletteDraggable]="'rect'">…</div>
 *         <div ... [appPaletteDraggable]="shape.name">…</div>
 */
@Directive({
    selector: '[appPaletteDraggable]',
    standalone: false,
})
export class PaletteDraggableDirective implements OnInit, OnDestroy {

    /** svg-editor mode id to place on drop (e.g. 'rect', 'shapes-hexagon', 'html_button'). */
    @Input('appPaletteDraggable') mode = '';

    private ghost?: HTMLDivElement;
    private onStart = (e: DragEvent) => this.handleStart(e);
    private onEnd   = (e: DragEvent) => this.handleEnd(e);

    constructor(
        private el: ElementRef<HTMLElement>,
        private renderer: Renderer2,
        private drop: EditorDropService,
    ) {}

    ngOnInit(): void {
        const node = this.el.nativeElement;
        this.renderer.setAttribute(node, 'draggable', 'true');
        this.renderer.setStyle(node, 'cursor', 'grab');
        node.addEventListener('dragstart', this.onStart);
        node.addEventListener('dragend', this.onEnd);
        // The actual placement happens on the canvas 'drop' event (instant — no
        // dragend snap-back delay). EditorDropService owns the single canvas
        // dragover/drop listeners; we just register intent here.
        this.drop.ensureCanvasDropListener();
    }

    ngOnDestroy(): void {
        const node = this.el.nativeElement;
        node.removeEventListener('dragstart', this.onStart);
        node.removeEventListener('dragend', this.onEnd);
        this.clearGhost();
    }

    private handleStart(e: DragEvent): void {
        if (!this.mode) { return; }
        if (e.dataTransfer) {
            e.dataTransfer.setData('text/plain', this.mode);
            e.dataTransfer.effectAllowed = 'copy';
        }

        // Drop-target highlight + global cursor cues
        document.getElementById('workarea')?.classList.add('ds-drop-zone-active');
        document.body.classList.add('ds-dragging-shape');

        // Build a clean dark-theme drag image (the native one is ugly on dark bg).
        // Mirror the source icon (background-image on the inner .icon-tool, OR the
        // icon-font class for hardcoded buttons).
        const ghost = document.createElement('div');
        ghost.className = 'ds-html5-ghost';
        const srcIcon = this.el.nativeElement.querySelector('.icon-tool') as HTMLElement | null;
        if (srcIcon) {
            const bg = getComputedStyle(srcIcon).backgroundImage;
            if (bg && bg !== 'none') {
                ghost.style.backgroundImage = bg;
            } else {
                // icon-font based control button — clone the span so the glyph shows
                const clone = srcIcon.cloneNode(true) as HTMLElement;
                clone.style.fontSize = '22px';
                clone.style.color = '#edf4ff';
                ghost.appendChild(clone);
                ghost.classList.add('ds-html5-ghost--font');
            }
        }
        document.body.appendChild(ghost);
        this.ghost = ghost;
        try { e.dataTransfer?.setDragImage(ghost, 22, 22); } catch { /* ignore */ }
    }

    /** dragend = cleanup ONLY. Placement happens on the canvas 'drop' event (instant). */
    private handleEnd(e: DragEvent): void {
        document.getElementById('workarea')?.classList.remove('ds-drop-zone-active');
        document.body.classList.remove('ds-dragging-shape');
        this.clearGhost();
    }

    private clearGhost(): void {
        if (this.ghost?.parentNode) { this.ghost.parentNode.removeChild(this.ghost); }
        this.ghost = undefined;
    }
}
