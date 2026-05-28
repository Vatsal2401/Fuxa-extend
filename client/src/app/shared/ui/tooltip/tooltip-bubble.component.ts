import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Visual bubble portalled by TooltipDirective.
 * Two compact rows: text + optional kbd shortcut chip.
 * All styling uses --ds-* tokens so it follows the active theme.
 */
@Component({
    selector: 'ds-tooltip-bubble',
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="ds-tip" role="tooltip">
            <span class="ds-tip__text">{{ text }}</span>
            <span class="ds-tip__kbd" *ngIf="shortcut">{{ shortcut }}</span>
        </div>
    `,
    styles: [`
        :host { display: block; pointer-events: none; }
        .ds-tip {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 6px 10px;
            border-radius: 8px;
            background: var(--ds-tooltip-bg, rgba(15, 24, 42, 0.96));
            color: var(--ds-tooltip-fg, #edf4ff);
            border: 1px solid var(--ds-tooltip-border, rgba(76, 159, 255, 0.22));
            box-shadow: 0 8px 22px rgba(0, 0, 0, 0.45);
            font-family: var(--ds-font-body, inherit);
            font-size: 12px;
            font-weight: 500;
            line-height: 1.3;
            letter-spacing: 0.01em;
            max-width: 280px;
            white-space: nowrap;
            backdrop-filter: blur(8px) saturate(120%);
            -webkit-backdrop-filter: blur(8px) saturate(120%);
            transform-origin: var(--ds-tip-origin, center top);
            animation: ds-tip-in 120ms cubic-bezier(.2,.7,.3,1) both;
        }
        .ds-tip__kbd {
            display: inline-flex; align-items: center;
            padding: 2px 6px;
            border-radius: 4px;
            background: rgba(76, 159, 255, 0.18);
            color: #cfe3ff;
            font-family: var(--ds-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
            font-size: 10.5px;
            font-weight: 600;
            letter-spacing: 0.02em;
            border: 1px solid rgba(76, 159, 255, 0.32);
        }
        @keyframes ds-tip-in {
            from { opacity: 0; transform: scale(0.92); }
            to   { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
            .ds-tip { animation: none; }
        }
    `],
})
export class TooltipBubbleComponent {
    @Input() text = '';
    @Input() shortcut?: string;
}
