import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';

import { TooltipDirective } from './tooltip.directive';
import { TooltipBubbleComponent } from './tooltip-bubble.component';
import { SymbolTooltipDirective } from './symbol-tooltip.directive';
import { SymbolTooltipCardComponent } from './symbol-tooltip-card.component';

/**
 * Tooltip system module.
 *
 *  - [appTooltip]         — modern text tooltip with optional kbd shortcut chip
 *  - [appSymbolTooltip]   — rich preview card (icon + name + category + tags)
 *
 * Import once in AppModule; the two directives are then usable in any template.
 */
@NgModule({
    imports: [CommonModule, OverlayModule, PortalModule],
    declarations: [
        TooltipDirective, TooltipBubbleComponent,
        SymbolTooltipDirective, SymbolTooltipCardComponent,
    ],
    exports: [TooltipDirective, SymbolTooltipDirective],
})
export class TooltipSystemModule {}
