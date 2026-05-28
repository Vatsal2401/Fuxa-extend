import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Rich preview card portalled by SymbolTooltipDirective.
 * Layout: large icon preview · name · category · alias chips · description.
 * All visuals are token-driven so dark/light themes Just Work.
 */
@Component({
    selector: 'ds-symbol-tooltip-card',
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="sym-card" role="tooltip" [class.sym-card--pinned]="pinned">
            <div class="sym-card__head">
                <div class="sym-card__icon"
                     [class.sym-card__icon--bg]="iconUrl"
                     [style.backgroundImage]="iconUrl ? 'url(' + iconUrl + ')' : null">
                    <mat-icon *ngIf="materialIcon && !iconUrl" class="sym-card__matico">{{ materialIcon }}</mat-icon>
                </div>
                <div class="sym-card__title-block">
                    <div class="sym-card__name">{{ name }}</div>
                    <div class="sym-card__cat" *ngIf="category">{{ category }}</div>
                </div>
            </div>
            <div class="sym-card__tags" *ngIf="tags?.length">
                <span class="sym-card__tag" *ngFor="let t of tags">{{ t }}</span>
            </div>
            <div class="sym-card__desc" *ngIf="description">{{ description }}</div>
            <div class="sym-card__hint" *ngIf="pinned">Esc to close</div>
            <div class="sym-card__hint sym-card__hint--alt" *ngIf="!pinned">Hold Alt to pin</div>
        </div>
    `,
    styles: [`
        :host { display: block; pointer-events: none; }
        .sym-card {
            display: flex; flex-direction: column; gap: 8px;
            min-width: 200px; max-width: 280px;
            padding: 12px 14px;
            border-radius: 12px;
            background: var(--ds-tooltip-bg, rgba(15, 24, 42, 0.97));
            color: var(--ds-tooltip-fg, #edf4ff);
            border: 1px solid var(--ds-tooltip-border, rgba(76, 159, 255, 0.28));
            box-shadow: 0 14px 38px rgba(0, 0, 0, 0.55);
            backdrop-filter: blur(10px) saturate(125%);
            -webkit-backdrop-filter: blur(10px) saturate(125%);
            font-family: var(--ds-font-body, inherit);
            transform-origin: var(--ds-tip-origin, center top);
            animation: ds-symcard-in 140ms cubic-bezier(.2,.7,.3,1) both;
        }
        .sym-card--pinned {
            pointer-events: auto;
            border-color: rgba(76, 159, 255, 0.55);
            box-shadow: 0 0 0 1px rgba(76, 159, 255, 0.35), 0 18px 44px rgba(0, 0, 0, 0.6);
        }
        .sym-card__head { display: flex; align-items: center; gap: 12px; }
        .sym-card__icon {
            flex: 0 0 auto;
            width: 56px; height: 56px;
            display: grid; place-items: center;
            border-radius: 10px;
            background-color: rgba(76, 159, 255, 0.08);
            border: 1px solid rgba(76, 159, 255, 0.18);
        }
        .sym-card__icon--bg {
            background-size: 38px 38px;
            background-position: center;
            background-repeat: no-repeat;
            filter: brightness(1.35) contrast(1.05);
        }
        .sym-card__matico { font-size: 30px; width: 30px; height: 30px; color: #cfe3ff; }
        .sym-card__title-block { min-width: 0; }
        .sym-card__name {
            font-size: 13px; font-weight: 600;
            color: var(--ds-tooltip-fg, #edf4ff);
            letter-spacing: 0.01em;
            text-transform: capitalize;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sym-card__cat {
            margin-top: 2px;
            font-size: 10.5px;
            color: rgba(207, 227, 255, 0.7);
            letter-spacing: 0.06em;
            text-transform: uppercase;
            font-weight: 600;
        }
        .sym-card__tags { display: flex; flex-wrap: wrap; gap: 4px; }
        .sym-card__tag {
            padding: 2px 7px;
            border-radius: 999px;
            background: rgba(76, 159, 255, 0.14);
            color: #cfe3ff;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.02em;
            border: 1px solid rgba(76, 159, 255, 0.22);
        }
        .sym-card__desc {
            color: rgba(225, 234, 248, 0.78);
            font-size: 11.5px;
            line-height: 1.45;
        }
        .sym-card__hint {
            margin-top: 2px;
            font-size: 10px;
            color: rgba(207, 227, 255, 0.55);
            letter-spacing: 0.04em;
        }
        .sym-card__hint--alt::before { content: ''; }
        @keyframes ds-symcard-in {
            from { opacity: 0; transform: scale(0.94) translateY(2px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
            .sym-card { animation: none; }
        }
    `],
})
export class SymbolTooltipCardComponent {
    @Input() name = '';
    @Input() category = '';
    /**
     * Icon source. Order of resolution: iconUrl → materialIcon.
     *
     * NOTE: do NOT add an "iconClass" input. The card renders via a CDK
     * Overlay attached to <body>, so Angular's view-encapsulation-scoped
     * .icon-X selectors (defined in editor.component.css) won't resolve
     * here. Use iconUrl with the asset path (e.g. assets/images/bag.svg)
     * for SVG-sprite icons, or materialIcon for Material glyphs.
     */
    @Input() iconUrl?: string;
    @Input() materialIcon?: string;
    @Input() tags: string[] = [];
    @Input() description?: string;
    @Input() pinned = false;
}
