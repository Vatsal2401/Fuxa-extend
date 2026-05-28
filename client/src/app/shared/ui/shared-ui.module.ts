/* =============================================================================
   FUXA Design System — Shared UI component library
   Reusable, token-driven, accessible standalone components.
   Import SharedUiModule into any feature module to use <ds-*> components.
   ============================================================================= */
import { NgModule, Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

/** Card / surface with optional header + footer slots. */
@Component({
  selector: 'ds-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ds-card" [class.ds-card--flat]="flat">
      <header class="ds-card__head" *ngIf="heading || subheading">
        <div>
          <h3 class="ds-card__title" *ngIf="heading">{{ heading }}</h3>
          <p class="ds-card__sub" *ngIf="subheading">{{ subheading }}</p>
        </div>
        <ng-content select="[card-actions]"></ng-content>
      </header>
      <div class="ds-card__body"><ng-content></ng-content></div>
      <footer class="ds-card__foot"><ng-content select="[card-footer]"></ng-content></footer>
    </section>`,
  styles: [`
    .ds-card{display:flex;flex-direction:column;background:var(--ds-surface);backdrop-filter:blur(18px);
      border:1px solid var(--ds-border);border-radius:var(--ds-radius-lg);box-shadow:var(--ds-shadow-lg);
      color:var(--ds-text);overflow:hidden;transition:transform var(--ds-dur-base) var(--ds-ease),box-shadow var(--ds-dur-base) var(--ds-ease)}
    .ds-card--flat{box-shadow:none}
    .ds-card__head{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--ds-sp-3);
      padding:var(--ds-sp-4) var(--ds-sp-5);border-bottom:1px solid var(--ds-border)}
    .ds-card__title{margin:0;font-family:var(--ds-font-display);font-size:var(--ds-fs-md);font-weight:var(--ds-fw-semibold)}
    .ds-card__sub{margin:.2rem 0 0;color:var(--ds-text-muted);font-size:var(--ds-fs-xs)}
    .ds-card__body{padding:var(--ds-sp-5);flex:1}
    .ds-card__foot:empty{display:none}
    .ds-card__foot{padding:0 var(--ds-sp-5) var(--ds-sp-4)}`],
})
export class DsCardComponent { @Input() heading?: string; @Input() subheading?: string; @Input() flat = false; }

/** Colored status pill (ok / warn / danger / info / neutral). */
@Component({
  selector: 'ds-status-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="ds-badge" [class]="'ds-badge--' + tone"><span class="ds-badge__dot" *ngIf="dot"></span><ng-content></ng-content></span>`,
  styles: [`
    .ds-badge{display:inline-flex;align-items:center;gap:.4rem;padding:.25rem .6rem;border-radius:var(--ds-radius-pill);
      font-size:var(--ds-fs-xs);font-weight:var(--ds-fw-semibold);line-height:1.4}
    .ds-badge__dot{width:7px;height:7px;border-radius:50%;background:currentColor}
    .ds-badge--ok{background:color-mix(in srgb,var(--ds-success) 16%,transparent);color:var(--ds-success)}
    .ds-badge--warn{background:color-mix(in srgb,var(--ds-warning) 16%,transparent);color:var(--ds-warning)}
    .ds-badge--danger{background:color-mix(in srgb,var(--ds-danger) 16%,transparent);color:var(--ds-danger)}
    .ds-badge--info{background:color-mix(in srgb,var(--ds-info) 16%,transparent);color:var(--ds-info)}
    .ds-badge--neutral{background:rgba(125,125,125,.16);color:var(--ds-text-muted)}`],
})
export class DsStatusBadgeComponent { @Input() tone: 'ok'|'warn'|'danger'|'info'|'neutral' = 'neutral'; @Input() dot = true; }

/** Page header: title, subtitle, breadcrumb + actions slot. */
@Component({
  selector: 'ds-page-header',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="ds-ph">
      <div class="ds-ph__text">
        <h1 class="ds-ph__title">{{ title }}</h1>
        <p class="ds-ph__sub" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="ds-ph__actions"><ng-content></ng-content></div>
    </header>`,
  styles: [`
    .ds-ph{display:flex;align-items:flex-end;justify-content:space-between;gap:var(--ds-sp-4);
      flex-wrap:wrap;padding:var(--ds-sp-5) 0 var(--ds-sp-4);border-bottom:1px solid var(--ds-border);margin-bottom:var(--ds-sp-5)}
    .ds-ph__title{margin:0;font-family:var(--ds-font-display);font-size:var(--ds-fs-xl);letter-spacing:.04em;color:var(--ds-text)}
    .ds-ph__sub{margin:.3rem 0 0;color:var(--ds-text-muted);font-size:var(--ds-fs-sm)}
    .ds-ph__actions{display:flex;gap:var(--ds-sp-2);align-items:center}`],
})
export class DsPageHeaderComponent { @Input() title = ''; @Input() subtitle?: string; }

/** Empty state with icon, message, optional action slot. */
@Component({
  selector: 'ds-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ds-state">
      <div class="ds-state__icon"><mat-icon>{{ icon }}</mat-icon></div>
      <h3 class="ds-state__title">{{ title }}</h3>
      <p class="ds-state__msg" *ngIf="message">{{ message }}</p>
      <div class="ds-state__action"><ng-content></ng-content></div>
    </div>`,
  styles: [`
    .ds-state{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
      padding:var(--ds-sp-12) var(--ds-sp-6);color:var(--ds-text-muted)}
    .ds-state__icon{display:grid;place-items:center;width:64px;height:64px;border-radius:var(--ds-radius-lg);
      background:rgba(var(--ds-brand-rgb),.12);color:var(--ds-brand);margin-bottom:var(--ds-sp-4)}
    .ds-state__icon mat-icon{font-size:32px;width:32px;height:32px}
    .ds-state__title{margin:0;color:var(--ds-text);font-size:var(--ds-fs-md);font-weight:var(--ds-fw-semibold)}
    .ds-state__msg{margin:.4rem 0 var(--ds-sp-4);max-width:42ch}`],
})
export class DsEmptyStateComponent { @Input() icon = 'inbox'; @Input() title = ''; @Input() message?: string; }

/** Loading state: spinner + optional skeleton rows. */
@Component({
  selector: 'ds-loading',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ds-loading" *ngIf="!skeleton; else skel">
      <mat-spinner [diameter]="36" color="primary"></mat-spinner>
      <span *ngIf="label">{{ label }}</span>
    </div>
    <ng-template #skel>
      <div class="ds-skel"><div class="ds-skel__row" *ngFor="let r of rows"></div></div>
    </ng-template>`,
  styles: [`
    .ds-loading{display:flex;flex-direction:column;align-items:center;gap:var(--ds-sp-3);padding:var(--ds-sp-10);color:var(--ds-text-muted)}
    .ds-skel{display:flex;flex-direction:column;gap:var(--ds-sp-3);padding:var(--ds-sp-4)}
    .ds-skel__row{height:18px;border-radius:var(--ds-radius-xs);
      background:linear-gradient(90deg,rgba(var(--ds-brand-rgb),.06),rgba(var(--ds-brand-rgb),.16),rgba(var(--ds-brand-rgb),.06));
      background-size:200% 100%;animation:ds-shimmer 1.3s var(--ds-ease) infinite}
    @keyframes ds-shimmer{to{background-position:-200% 0}}`],
})
export class DsLoadingComponent {
  @Input() label?: string;
  @Input() skeleton = false;
  @Input() set rowCount(n: number) { this.rows = Array(n).fill(0); }
  rows = Array(4).fill(0);
}

/** Error state with retry slot. */
@Component({
  selector: 'ds-error-state',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ds-state ds-state--err">
      <div class="ds-state__icon"><mat-icon>error_outline</mat-icon></div>
      <h3 class="ds-state__title">{{ title }}</h3>
      <p class="ds-state__msg" *ngIf="message">{{ message }}</p>
      <div class="ds-state__action"><ng-content></ng-content></div>
    </div>`,
  styles: [`
    .ds-state{display:flex;flex-direction:column;align-items:center;text-align:center;padding:var(--ds-sp-12) var(--ds-sp-6);color:var(--ds-text-muted)}
    .ds-state__icon{display:grid;place-items:center;width:64px;height:64px;border-radius:var(--ds-radius-lg);
      background:color-mix(in srgb,var(--ds-danger) 14%,transparent);color:var(--ds-danger);margin-bottom:var(--ds-sp-4)}
    .ds-state__icon mat-icon{font-size:32px;width:32px;height:32px}
    .ds-state__title{margin:0;color:var(--ds-text);font-size:var(--ds-fs-md);font-weight:var(--ds-fw-semibold)}
    .ds-state__msg{margin:.4rem 0 var(--ds-sp-4);max-width:42ch}`],
})
export class DsErrorStateComponent { @Input() title = 'Something went wrong'; @Input() message?: string; }

const COMPONENTS = [
  DsCardComponent, DsStatusBadgeComponent, DsPageHeaderComponent,
  DsEmptyStateComponent, DsLoadingComponent, DsErrorStateComponent,
];

@NgModule({
  imports: [CommonModule, TranslateModule, ...COMPONENTS],
  exports: [...COMPONENTS],
})
export class SharedUiModule {}
