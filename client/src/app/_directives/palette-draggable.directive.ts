import { Directive, ElementRef, Input, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { DragDrop, DragRef } from '@angular/cdk/drag-drop';
import { EditorDropService } from '../_services/editor-drop.service';

/**
 * Single unified drag-to-place directive used by ALL palette items
 * (Shape, Proc.Eng, Animation, Controls, General).
 *
 * Uses Angular CDK's DragDrop service programmatically (DragRef API) so the
 * same directive works on any element regardless of how it was templated.
 * No native HTML5 drag, no two-system inconsistency.
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

    private dragRef?: DragRef;

    constructor(
        private el: ElementRef<HTMLElement>,
        private renderer: Renderer2,
        private dragDrop: DragDrop,
        private drop: EditorDropService,
    ) {}

    ngOnInit(): void {
        const node = this.el.nativeElement;

        // CDK behaviour cues at the source element
        this.renderer.setStyle(node, 'cursor', 'grab');
        this.renderer.setStyle(node, 'touch-action', 'none');

        // Create a CDK DragRef on this element
        this.dragRef = this.dragDrop.createDrag(node);

        // No start delay — snappy like Figma. CDK only starts drag after the
        // pointer moves past a tiny threshold (built-in), so quick clicks still
        // fire (click) and not drag.
        // dragRef.withRootElement(node) is implicit via createDrag.

        this.dragRef.started.subscribe(() => {
            document.getElementById('workarea')?.classList.add('ds-drop-zone-active');
            document.body.classList.add('ds-dragging-shape');
        });

        this.dragRef.ended.subscribe((event: any) => {
            document.getElementById('workarea')?.classList.remove('ds-drop-zone-active');
            document.body.classList.remove('ds-dragging-shape');

            if (!this.mode) { return; }
            const dropPoint = event?.dropPoint;
            if (!dropPoint) { return; }                      // cancelled / Esc

            // Tiny distance = treat as a click (let the (click) handler do its thing)
            const dist = event?.distance ? Math.hypot(event.distance.x, event.distance.y) : 0;
            if (dist < 5) { return; }

            this.drop.placeAtScreenPoint({ name: this.mode }, dropPoint.x, dropPoint.y);
        });
    }

    ngOnDestroy(): void {
        this.dragRef?.dispose();
    }
}
