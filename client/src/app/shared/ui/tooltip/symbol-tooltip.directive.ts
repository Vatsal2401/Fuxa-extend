import {
    Directive, ElementRef, HostListener, Input, OnDestroy,
} from '@angular/core';
import {
    Overlay, OverlayRef, OverlayPositionBuilder, ConnectedPosition,
    ScrollStrategyOptions,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { SymbolTooltipCardComponent } from './symbol-tooltip-card.component';

export interface SymbolTooltipModel {
    name: string;
    category?: string;
    iconUrl?: string;
    iconClass?: string;
    materialIcon?: string;
    tags?: string[];
    description?: string;
}

/**
 * Rich preview tooltip for palette items (Proc.Eng, Shapes, Widgets…).
 *
 * Built on CDK Overlay so it can render a real Angular component (icon preview,
 * name, category, alias chips). Lazy: no overlay is created until the user
 * hovers — kept cheap for grids with 200+ symbols.
 *
 * UX features:
 *   - 200ms show delay, 100ms hide delay (no flicker on fast cursor moves).
 *   - Hold Alt to "pin" the card → it stays open until Esc or the host is left
 *     for >250ms. Useful for reading long descriptions / inspecting tags.
 *   - Auto edge-flip via flexibleConnectedTo positions.
 *   - Disabled when prefers-reduced-motion is set (animations stripped in card CSS).
 *
 * Usage:
 *   <div [appSymbolTooltip]="{ name: shape.name, iconUrl: shape.ico,
 *                              category: shGrp.name, tags: ['valve','flow'] }">…</div>
 */
@Directive({
    selector: '[appSymbolTooltip]',
    standalone: false,
})
export class SymbolTooltipDirective implements OnDestroy {

    @Input('appSymbolTooltip') model: SymbolTooltipModel | null = null;
    @Input('appSymbolTooltipShowDelay') showDelay = 200;
    @Input('appSymbolTooltipHideDelay') hideDelay = 100;

    private overlayRef?: OverlayRef;
    private cardRef?: SymbolTooltipCardComponent;
    private showTimer: any = null;
    private hideTimer: any = null;
    private pinned = false;
    private altDown = false;

    constructor(
        private host: ElementRef<HTMLElement>,
        private overlay: Overlay,
        private posBuilder: OverlayPositionBuilder,
        private sso: ScrollStrategyOptions,
    ) {}

    @HostListener('mouseenter') onEnter() { this.scheduleShow(); }
    @HostListener('mouseleave') onLeave() {
        if (this.pinned) { return; }     // pinned cards stay until Esc
        this.scheduleHide();
    }
    @HostListener('focus') onFocus() { this.scheduleShow(0); }
    @HostListener('blur')  onBlur()  { if (!this.pinned) { this.hide(); } }
    @HostListener('click') onClick() { this.hide(); }   // drag/drop or place — dismiss

    @HostListener('document:keydown.alt') onAltDown() {
        this.altDown = true;
        if (this.overlayRef?.hasAttached() && !this.pinned) { this.pin(); }
    }
    @HostListener('document:keyup.alt') onAltUp() { this.altDown = false; }
    @HostListener('document:keydown.escape') onEsc() { this.unpinAndHide(); }

    ngOnDestroy() { this.hide(); this.overlayRef?.dispose(); this.overlayRef = undefined; }

    private scheduleShow(delay = this.showDelay) {
        clearTimeout(this.hideTimer); this.hideTimer = null;
        if (this.overlayRef?.hasAttached() || !this.model) { return; }
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
        if (!this.model) { return; }
        this.ensureOverlay();
        const ref = this.overlayRef!.attach(new ComponentPortal(SymbolTooltipCardComponent));
        const c = ref.instance;
        c.name = this.model.name;
        c.category = this.model.category || '';
        c.iconUrl = this.model.iconUrl;
        c.iconClass = this.model.iconClass;
        c.materialIcon = this.model.materialIcon;
        c.tags = this.model.tags || [];
        c.description = this.model.description;
        c.pinned = this.pinned;
        this.cardRef = c;
        // If Alt is already held when the tooltip opens, pin immediately.
        if (this.altDown && !this.pinned) { this.pin(); }
    }

    private hide() {
        clearTimeout(this.showTimer); clearTimeout(this.hideTimer);
        this.showTimer = this.hideTimer = null;
        if (this.overlayRef?.hasAttached()) { this.overlayRef.detach(); }
        this.cardRef = undefined;
    }

    private pin() {
        this.pinned = true;
        if (this.cardRef) { this.cardRef.pinned = true; }
    }

    private unpinAndHide() {
        this.pinned = false;
        this.hide();
    }

    private ensureOverlay() {
        if (this.overlayRef) { return; }
        const right: ConnectedPosition = { originX:'end',    originY:'center', overlayX:'start',  overlayY:'center', offsetX: 10 };
        const left:  ConnectedPosition = { originX:'start',  originY:'center', overlayX:'end',    overlayY:'center', offsetX:-10 };
        const below: ConnectedPosition = { originX:'center', originY:'bottom', overlayX:'center', overlayY:'top',    offsetY: 10 };
        const above: ConnectedPosition = { originX:'center', originY:'top',    overlayX:'center', overlayY:'bottom', offsetY:-10 };
        const strategy = this.posBuilder
            .flexibleConnectedTo(this.host)
            .withPositions([right, left, below, above])
            .withPush(false)
            .withFlexibleDimensions(false)
            .withViewportMargin(12);
        this.overlayRef = this.overlay.create({
            positionStrategy: strategy,
            scrollStrategy: this.sso.reposition(),
            panelClass: ['ds-symbol-tooltip-panel'],
            hasBackdrop: false,
        });
    }
}
