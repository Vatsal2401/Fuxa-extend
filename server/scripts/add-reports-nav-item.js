#!/usr/bin/env node
/**
 * Adds a "Reports" item to the sidebar navigation of a running FUXA/TracIoT
 * project database, without touching anything else already configured.
 *
 * Usage (run from the `server` folder, or pass an explicit db path):
 *   node scripts/add-reports-nav-item.js
 *   node scripts/add-reports-nav-item.js /path/to/_appdata/project.fuxap.db
 *
 * IMPORTANT: stop the FUXA server before running this, then start it again
 * afterwards. The server loads project.fuxap.db into memory at startup and
 * only flushes its own in-memory state back to disk on changes made through
 * the UI/API — running this script while the server is up risks either the
 * change being invisible until restart, or the server clobbering it later.
 *
 * Safe to re-run: if a Reports item already exists it is left untouched.
 */

const path = require('path');
const sqlite3 = require('sqlite3');

const dbPath = process.argv[2] || path.join(__dirname, '..', '_appdata', 'project.fuxap.db');

const REPORTS_ITEM = {
    id: 'nav_reports',
    text: 'Reports',
    link: 'reports',
    view: '[link]',
    icon: 'content_paste',
    image: '',
    permission: 0,
    permissionRoles: { show: [], enabled: [] },
    children: []
};

const DEFAULT_LAYOUT = {
    autoresize: false,
    start: '',
    navigation: {
        mode: 'over',
        type: 'block',
        bkcolor: '#F4F5F7',
        fgcolor: '#1D1D1D',
        items: [REPORTS_ITEM],
        logo: false
    },
    header: {
        title: '',
        bkcolor: '#ffffff',
        fgcolor: '#000000',
        height: 46,
        buttonHeight: 36,
        fontSize: 13,
        items: [],
        itemsAnchor: 'left',
        loginInfo: 'nothing'
    },
    showdev: true,
    inputdialog: 'false',
    hidenavigation: false,
    theme: '',
    loginonstart: false,
    loginoverlaycolor: 'none',
    show_connection_error: true,
    customStyles: ''
};

function alreadyHasReports(items) {
    return (items || []).some(item => item.link === REPORTS_ITEM.link || item.id === REPORTS_ITEM.id);
}

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (openErr) => {
    if (openErr) {
        console.error(`Could not open database at ${dbPath}:`, openErr.message);
        process.exit(1);
    }

    db.get('SELECT value FROM general WHERE name = ?', ['layout'], (err, row) => {
        if (err) {
            console.error('Failed to read layout row:', err.message);
            db.close();
            process.exit(1);
        }

        let layout;
        let action;

        if (!row) {
            layout = DEFAULT_LAYOUT;
            action = 'inserted fresh layout (none existed)';
        } else {
            layout = JSON.parse(row.value);
            layout.navigation = layout.navigation || { items: [] };
            layout.navigation.items = layout.navigation.items || [];

            if (alreadyHasReports(layout.navigation.items)) {
                console.log('Reports nav item already present — nothing to do.');
                db.close();
                return;
            }

            layout.navigation.items.push(REPORTS_ITEM);
            action = 'appended Reports item to existing layout';
        }

        db.run(
            'INSERT OR REPLACE INTO general (name, value) VALUES (?, ?)',
            ['layout', JSON.stringify(layout)],
            function (writeErr) {
                if (writeErr) {
                    console.error('Failed to write layout row:', writeErr.message);
                    db.close();
                    process.exit(1);
                }
                console.log(`Done: ${action}.`);
                console.log('Restart the FUXA server for the change to take effect.');
                db.close();
            }
        );
    });
});
