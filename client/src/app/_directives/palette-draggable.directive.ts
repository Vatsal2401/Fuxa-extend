import { Directive, ElementRef, HostListener, Input, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { EditorDropService } from '../_services/editor-drop.service';

/**
 * Adds drag-to-place behaviour to ANY element by tag/class (e.g. <div class="svg-tool-button">).
 * Use it like:  <div ... appPaletteDraggable="rect">…</div>
 *
 * Uses native HTML5 drag (drag/dragend) to avoid having to template-edit every
 * hardcoded palette button. Falls back to the existing click handler naturally
 * for non-drag interactions (a click without drag still fires (click)).
 */
@Directive({
    selector: '[appPaletteDraggable]',
    standalone: false,
})
export class PaletteDraggableDirective implements OnInit, OnDestroy {

    /** The svgEditor mode id to enter on drop (e.g. 'rect', 'value', 'html_button'). */
    @Input('appPaletteDraggable') mode = '';

    private ghost?: HTMLDivElement;
    private dragStartHandler?: (e: DragEvent) => void;
    private dragEndHandler?:   (e: DragEvent) => void;
    private dragOverHandler?:  (e: DragEvent) => void;

    constructor(
        private el: ElementRef<HTMLElement>,
        private renderer: Renderer2,
        private drop: EditorDropService,
    ) {}

    ngOnInit(): void {
        const node = this.el.nativeElement;
        this.renderer.setAttribute(node, 'draggable', 'true');
        this.renderer.setStyle(node, 'cursor', 'grab');
        this.renderer.setStyle(node, 'touch-action', 'none');

        this.dragStartHandler = (e: DragEvent) => this.onDragStart(e);
        this.dragEndHandler   = (e: DragEvent) => this.onDragEnd(e);
        node.addEventListener('dragstart', this.dragStartHandler);
        node.addEventListener('dragend',   this.dragEndHandler);

        // Allow drop on the canvas
        this.dragOverHandler = (e: DragEvent) => { e.preventDefault(); };
        const workarea = document.getElementById('workarea');
        workarea?.addEventListener('dragover', this.dragOverHandler);
    }

    ngOnDestroy(): void {
        const node = this.el.nativeElement;
        if (this.dragStartHandler) { node.removeEventListener('dragstart', this.dragStartHandler); }
        if (this.dragEndHandler)   { node.removeEventListener('dragend',   this.dragEndHandler);   }
        if (this.dragOverHandler) {
            const workarea = document.getElementById('workarea');
            workarea?.removeEventListener('dragover', this.dragOverHandler);
        }
        this.clearGhost();
    }

    private onDragStart(e: DragEvent): void {
        if (!this.mode) { return; }
        e.dataTransfer?.setData('text/plain', this.mode);
        if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'copy'; }

        // Highlight the canvas as drop target + global drag-mode cues (cursor, invalid zones)
        document.getElementById('workarea')?.classList.add('ds-drop-zone-active');
        document.body.classList.add('ds-dragging-shape');

        // Custom transparent ghost (the native drag image is hideous on dark themes)
        const src = this.el.nativeElement;
        const ghost = document.createElement('div');
        ghost.className = 'ds-drag-preview';
        // Try to mirror the icon if there's an .icon-tool child with backgroundImage
        const icon = src.querySelector('.icon-tool') as HTMLElement | null;
        const bg = icon ? getComputedStyle(icon).backgroundImage : '';
        if (bg && bg !== 'none') { ghost.style.backgroundImage = bg; }
        ghost.style.position = 'absolute';
        ghost.style.top = '-1000px';
        document.body.appendChild(ghost);
        this.ghost = ghost;
        try { e.dataTransfer?.setDragImage(ghost, 22, 22); } catch { /* ignore */ }
    }

    private onDragEnd(e: DragEvent): void {
        document.getElementById('workarea')?.classList.remove('ds-drop-zone-active');
        document.body.classList.remove('ds-dragging-shape');
        this.clearGhost();
        if (!this.mode) { return; }
        // dropEffect 'none' = user dropped outside any valid target / cancelled
        if (e.dataTransfer?.dropEffect === 'none') { return; }
        this.drop.placeAtScreenPoint({ name: this.mode }, e.clientX, e.clientY);
    }

    private clearGhost(): void {
        if (this.ghost && this.ghost.parentNode) { this.ghost.parentNode.removeChild(this.ghost); }
        this.ghost = undefined;
    }
}
