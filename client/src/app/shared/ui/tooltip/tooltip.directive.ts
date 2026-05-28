import {
    Directive, ElementRef, HostListener, Input, OnDestroy, Renderer2,
} from '@angular/core';
import { Overlay, OverlayRef, OverlayPositionBuilder, ConnectedPosition, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { TooltipBubbleComponent } from './tooltip-bubble.component';

/**
 * Lightweight text-tooltip directive built on CDK Overlay.
 *
 * Why not extend MatTooltip directly:
 *   - MatTooltip is text-only and can't render a styled keyboard-shortcut hint.
 *   - We want a single owner of show/hide timing, position fallbacks, focus/blur,
 *     escape-to-dismiss, and pin-on-Alt — all reused by [appSymbolTooltip].
 *   - CDK Overlay is already in the bundle (mat-tooltip uses it).
 *
 * Usage:
 *   <button appTooltip="Save project" appTooltipShortcut="Ctrl+S">…</button>
 *   <div   appTooltip="Pencil" appTooltipPlacement="right">…</div>
 */
@Directive({
    selector: '[appTooltip]',
    standalone: false,
})
export class TooltipDirective implements OnDestroy {

    /** Tooltip text (translated string). Empty disables the tooltip. */
    @Input('appTooltip') text = '';
    /** Optional keyboard hint shown as a small kbd chip (e.g. "Ctrl+S"). */
    @Input('appTooltipShortcut') shortcut?: string;
    /** Preferred placement. "auto" tries below → above → right → left. */
    @Input('appTooltipPlacement') placement: 'auto'|'above'|'below'|'left'|'right' = 'auto';
    /** Show delay in ms. */
    @Input('appTooltipShowDelay') showDelay = 150;
    /** Hide delay in ms — small grace so cursor can travel to the bubble if needed. */
    @Input('appTooltipHideDelay') hideDelay = 80;

    private overlayRef?: OverlayRef;
    private showTimer: any = null;
    private hideTimer: any = null;
    private bubble?: TooltipBubbleComponent;

    constructor(
        private host: ElementRef<HTMLElement>,
        private overlay: Overlay,
        private posBuilder: OverlayPositionBuilder,
        private sso: ScrollStrategyOptions,
        private renderer: Renderer2,
    ) {}

    @HostListener('mouseenter') onEnter() { this.scheduleShow(); }
    @HostListener('mouseleave') onLeave() { this.scheduleHide(); }
    @HostListener('focus')      onFocus() { this.scheduleShow(0); }
    @HostListener('blur')       onBlur()  { this.hide(); }
    @HostListener('document:keydown.escape') onEsc() { this.hide(); }
    /** If the host is clicked the tooltip is no longer relevant. */
    @HostListener('click')      onClick() { this.hide(); }

    ngOnDestroy() { this.hide(); }

    private scheduleShow(delay = this.showDelay) {
        clearTimeout(this.hideTimer); this.hideTimer = null;
        if (this.overlayRef?.hasAttached() || !this.text) { return; }
        clearTimeout(this.showTimer);
        this.showTimer = setTimeout(() => this.show(), delay);
    }

    private scheduleHide() {
        clearTimeout(this.showTimer); this.showTimer = null;
        if (!this.overlayRef?.hasAttached()) { return; }
        clearTimeout(this.hideTimer);
        this.hideTimer = setTimeout(() => this.hide(), this.hideDelay);
    }

    private show() {
        if (!this.text) { return; }
        this.ensureOverlay();
        const portal = new ComponentPortal(TooltipBubbleComponent);
        const ref = this.overlayRef!.attach(portal);
        this.bubble = ref.instance;
        this.bubble.text = this.text;
        this.bubble.shortcut = this.shortcut;
    }

    private hide() {
        clearTimeout(this.showTimer); clearTimeout(this.hideTimer);
        this.showTimer = this.hideTimer = null;
        if (this.overlayRef?.hasAttached()) { this.overlayRef.detach(); }
        this.bubble = undefined;
    }

    private ensureOverlay() {
        if (this.overlayRef) { return; }
        const positions = this.buildPositions();
        const strategy = this.posBuilder
            .flexibleConnectedTo(this.host)
            .withPositions(positions)
            .withPush(false)
            .withFlexibleDimensions(false)
            .withViewportMargin(8);
        this.overlayRef = this.overlay.create({
            positionStrategy: strategy,
            scrollStrategy: this.sso.reposition(),
            panelClass: ['ds-tooltip-panel'],
            hasBackdrop: false,
        });
    }

    private buildPositions(): ConnectedPosition[] {
        const below: ConnectedPosition  = { originX:'center', originY:'bottom', overlayX:'center', overlayY:'top',    offsetY: 8 };
        const above: ConnectedPosition  = { originX:'center', originY:'top',    overlayX:'center', overlayY:'bottom', offsetY:-8 };
        const right: ConnectedPosition  = { originX:'end',    originY:'center', overlayX:'start',  overlayY:'center', offsetX: 8 };
        const left:  ConnectedPosition  = { originX:'start',  originY:'center', overlayX:'end',    overlayY:'center', offsetX:-8 };
        switch (this.placement) {
            case 'above':  return [above, below, right, left];
            case 'below':  return [below, above, right, left];
            case 'right':  return [right, left, below, above];
            case 'left':   return [left, right, below, above];
            default:       return [below, above, right, left];
        }
    }
}
