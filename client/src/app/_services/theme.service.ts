import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Theme service — single owner of the active theme (dark | light).
 *
 * Sources of truth (precedence on cold boot):
 *   1. Inline pre-boot script in index.html (which already reads
 *      localStorage + prefers-color-scheme and sets `dark-theme` on <html>)
 *   2. Saved user pref in localStorage     (key: `fuxa.theme`)
 *   3. Project-stored layoutTheme           (applied later by HeaderComponent
 *                                            after the project loads)
 *   4. OS-level `prefers-color-scheme`
 *   5. Default → dark (FUXA aesthetic)
 *
 * All chrome styling now lives in --ds-* CSS tokens (see styles/_tokens.scss),
 * with legacy --headerBackground etc. aliased to the same tokens, so toggling
 * the .dark-theme class is sufficient — no setProperty loop required.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {

    static ThemeType = { Dark: 'dark', Default: 'default' } as const;
    private static readonly STORAGE_KEY = 'fuxa.theme';
    private static readonly TRANSITION_CLASS = 'theme-transitioning';

    private theme$ = new BehaviorSubject<'dark' | 'light'>('dark');
    /** Emits whenever the active theme changes. Subscribe in components that
     *  need to swap icons/labels (e.g. sun/moon button in the header). */
    readonly themeChanges: Observable<'dark' | 'light'> = this.theme$.asObservable();

    constructor(@Inject(DOCUMENT) private document: Document) {
        this.initFromEnvironment();
        this.watchSystemPreference();
    }

    /** Current theme name (mirrors the body class). */
    getCurrent(): 'dark' | 'light' { return this.theme$.value; }
    isDark(): boolean { return this.theme$.value === 'dark'; }

    /** Toggle dark ↔ light (also persists to localStorage). */
    toggle(): void {
        this.setTheme(this.isDark() ? ThemeService.ThemeType.Default : ThemeService.ThemeType.Dark);
    }

    /**
     * Apply a theme. Accepts the legacy 'dark' | 'default' strings so existing
     * call sites (HeaderComponent.onChangeTheme, ProjectService.layoutTheme)
     * keep working.
     */
    setTheme(name: string = ThemeService.ThemeType.Dark, persist = true): void {
        const isDark = name === ThemeService.ThemeType.Dark;
        const next: 'dark' | 'light' = isDark ? 'dark' : 'light';
        if (next === this.theme$.value && this.classApplied(next)) { return; }   // no-op
        this.applyClass(next);
        if (persist) {
            try { localStorage.setItem(ThemeService.STORAGE_KEY, next); } catch { /* private mode */ }
        }
        this.theme$.next(next);
    }

    /* -------- internal -------- */

    private initFromEnvironment(): void {
        // The inline script in index.html has already applied the right class
        // before Angular bootstrapped — we just read it back so the observable
        // starts on the correct value (no FOUC, no double-paint).
        const html = this.document.documentElement;
        const body = this.document.body;
        const hasClass = html.classList.contains('dark-theme') || body?.classList.contains('dark-theme');
        const initial: 'dark' | 'light' = hasClass ? 'dark' : 'light';
        // Mirror onto body so legacy selectors that target body.dark-theme keep working.
        this.applyClass(initial, false);
        this.theme$.next(initial);
    }

    /** React to OS theme changes — but only if the user hasn't explicitly chosen. */
    private watchSystemPreference(): void {
        if (typeof window === 'undefined' || !window.matchMedia) { return; }
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
            const userPick = (() => { try { return localStorage.getItem(ThemeService.STORAGE_KEY); } catch { return null; } })();
            if (userPick) { return; }   // explicit choice wins
            this.setTheme(e.matches ? ThemeService.ThemeType.Dark : ThemeService.ThemeType.Default, false);
        };
        if (mql.addEventListener) { mql.addEventListener('change', handler); }
        else if ((mql as any).addListener) { (mql as any).addListener(handler); }   // Safari < 14
    }

    private applyClass(theme: 'dark' | 'light', withTransition = true): void {
        const html = this.document.documentElement;
        const body = this.document.body;
        if (withTransition) { html.classList.add(ThemeService.TRANSITION_CLASS); }
        html.classList.toggle('dark-theme', theme === 'dark');
        body?.classList.toggle('dark-theme', theme === 'dark');
        if (withTransition) {
            // Strip transition class after the swap settles to avoid lingering
            // transitions on micro-animations (hover/focus) that should be snappy.
            setTimeout(() => html.classList.remove(ThemeService.TRANSITION_CLASS), 260);
        }
    }

    private classApplied(theme: 'dark' | 'light'): boolean {
        const has = this.document.documentElement.classList.contains('dark-theme');
        return (theme === 'dark') === has;
    }
}
