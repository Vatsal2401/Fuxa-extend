// custom-shapes.js
// Lets a user UPLOAD an SVG from disk straight into the "Shape" palette — no rebuild.
// - Uploaded shapes are parsed into FUXA's shape content format and stored in localStorage.
// - On every load they are re-registered into svgEditor.shapesGrps so they appear in the palette.
// - A floating "Upload SVG shape" button is injected (editor page only).
(function () {
    'use strict';

    var STORAGE_KEY = 'fuxa_custom_shapes';
    var shapesGroupName = 'editor.shape';   // same group as the built-in "Shape" palette
    var typeId = 'shapes';                   // bound to the angular ShapesComponent

    function loadStored() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
        catch (e) { return []; }
    }
    function saveStored(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    // Register stored custom shapes into the palette (runs at load, before the editor reads the list)
    function registerShapes() {
        if (typeof svgEditor === 'undefined' || !svgEditor.shapesGrps) { return; }
        var stored = loadStored();
        if (!stored.length) { return; }
        var shapes = stored.map(function (s) {
            return { name: typeId + '-' + s.name, ico: s.ico, content: s.content };
        });
        if (svgEditor.shapesGrps[shapesGroupName]) {
            shapes.forEach(function (sh) { svgEditor.shapesGrps[shapesGroupName].push(sh); });
        } else {
            svgEditor.shapesGrps[shapesGroupName] = shapes;
        }
    }
    registerShapes();

    // Parse an uploaded SVG string into FUXA content[] = [{ id, type, attr }]
    var DRAW = ['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'];
    function svgToContent(svgText) {
        var doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
        var svg = doc.querySelector('svg');
        if (!svg) { return null; }
        var content = [];
        DRAW.forEach(function (tag) {
            Array.prototype.forEach.call(svg.querySelectorAll(tag), function (el) {
                var attr = {};
                for (var i = 0; i < el.attributes.length; i++) {
                    var a = el.attributes[i];
                    if (a.name === 'id') { continue; }
                    attr[a.name] = a.value;
                }
                content.push({ id: '', type: tag, attr: attr });
            });
        });
        return content.length ? content : null;
    }

    function addUploadedSvg(name, svgText) {
        var content = svgToContent(svgText);
        if (!content) {
            alert('Could not parse this SVG. It must contain drawable elements (path, rect, circle, ellipse, line, polyline, polygon).');
            return;
        }
        var ico = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgText)));
        var stored = loadStored();
        // replace if same name exists
        stored = stored.filter(function (s) { return s.name !== name; });
        stored.push({ name: name, ico: ico, content: content });
        saveStored(stored);
        alert('Shape "' + name + '" added to the Shape palette. Reloading the editor…');
        location.reload();
    }

    // Floating upload button (only on the editor route)
    function injectButton() {
        if (document.getElementById('fuxa-upload-shape-btn')) { return; }
        var btn = document.createElement('button');
        btn.id = 'fuxa-upload-shape-btn';
        btn.textContent = '⬆ Upload SVG shape';
        btn.title = 'Upload an SVG file from disk into the Shape palette';
        btn.style.cssText = 'position:fixed;top:54px;right:14px;z-index:99999;' +
            'background:linear-gradient(135deg,#4c9fff,#1ed5ff);color:#fff;border:none;' +
            'padding:9px 15px;border-radius:10px;font:600 13px sans-serif;cursor:pointer;' +
            'box-shadow:0 6px 20px rgba(24,116,255,.45);';

        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.svg,image/svg+xml';
        input.style.display = 'none';
        input.addEventListener('change', function () {
            var f = input.files && input.files[0];
            if (!f) { return; }
            var reader = new FileReader();
            reader.onload = function () {
                var defName = (f.name || 'shape').replace(/\.svg$/i, '');
                var name = prompt('Name for this shape:', defName);
                if (!name) { return; }
                addUploadedSvg(name.replace(/[^a-zA-Z0-9_-]/g, '_'), String(reader.result));
            };
            reader.readAsText(f);
            input.value = '';
        });
        btn.addEventListener('click', function () { input.click(); });

        document.body.appendChild(btn);
        document.body.appendChild(input);
    }

    function updateVisibility() {
        if (!document.body) { return; }
        var onEditor = location.pathname.indexOf('/editor') >= 0;
        injectButton();
        var btn = document.getElementById('fuxa-upload-shape-btn');
        if (btn) { btn.style.display = onEditor ? 'block' : 'none'; }
    }

    updateVisibility();
    document.addEventListener('DOMContentLoaded', updateVisibility);
    window.addEventListener('popstate', updateVisibility);
    setInterval(updateVisibility, 1500);
}());
