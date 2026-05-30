# BrandX — Industrial Dashboard Builder

> A rebranded fork of [FUXA](https://github.com/frangoteam/FUXA) with a full design-system rewrite, modernized editor UX, smart alignment guides, and end-to-end token-driven theming.

[![Branch](https://img.shields.io/badge/branch-feat%2Fdesign--system-blue)](#)
[![Node](https://img.shields.io/badge/node-18%20LTS-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## What's BrandX?

BrandX is a full **rebrand + UI/UX overhaul** of FUXA — same underlying SCADA / HMI engine, completely redesigned editor experience. Key additions:

- 🎨 **Design-system foundation** — `--ds-*` CSS tokens (light + dark), proper Material dark theme, sun/moon header toggle with `localStorage` persistence + `prefers-color-scheme` watch
- 🧭 **Modernized editor sidebar** — brand-gradient highlight on expanded panels, pill search with focus glow, soft accent stripe on selected view
- 🛠️ **Smart alignment guides + grid overlay** — Figma-style dashed brand-blue guides while dragging, custom SVG grid overlay that lives ON TOP of user content (visible even with opaque view fills), `G` / `S` keyboard shortcuts, Alt-hold to bypass snap
- 🎯 **Rich tooltip system** — `appTooltip` (text + `Ctrl+S`-style kbd chip) + `appSymbolTooltip` (icon + name + category + tags) on every palette item, built on CDK Overlay
- 🔌 **Plugins page polish** — readable disabled "Install" button, token-driven card hover, danger-tinted Remove hover
- 🏠 **Welcome screen** on `/home` with 4 quick-action cards
- 🚀 **Apps launcher dropdown** replacing the old FAB stack
- 🌐 **13 i18n languages** rebranded with `BrandX` text + "Powered by FUXA · frangoteam" attribution in the About dialog

See `git log feat/design-system` for the full commit history of UX work.

---

## Quick start (local development)

### Prerequisites

- **Node.js 18 LTS** (the project ships a sqlite3 binding compiled for Node 18 — newer versions may need a rebuild)
- **npm 8+**
- **Git**
- **Linux / macOS / Windows** (Linux build path is most exercised)

### One-time setup

```bash
git clone https://github.com/Vatsal2401/Fuxa-extend.git brandx
cd brandx

# Switch to the design-system branch (default)
git checkout feat/design-system

# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies + build the Angular bundle
cd client
npm install
npm run build
cd ..
```

> The `client/dist/` directory is checked into the repo so a clone runs out of the box without building. Re-run `npm run build` after pulling new commits.

### Run the server

```bash
cd server
npm start
```

Open **http://localhost:1881** in your browser.

| Route | What you see |
|---|---|
| `/home` | BrandX welcome screen |
| `/editor` | The full visual editor — sidebar, canvas, grid toolbar, smart guides |
| `/device` | Device / connection configuration |
| `/alarms` | Alarms & events |
| `/plugins` | Plugin manager |

### Develop the client with live reload

```bash
cd client
npm start              # ng serve on http://localhost:4200
# In another shell:
cd server && npm start # FUXA API + DAQ on :1881
```

Configure the Angular dev server to proxy `/api` requests to `:1881` if you want both running side by side.

---

## Project structure

```
brandx/
├── client/                       Angular 18 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── editor/           SVG editor + property panels
│   │   │   ├── header/           BrandX top header
│   │   │   ├── home/             Welcome screen (when no homepage view set)
│   │   │   ├── plugins/          Plugin manager UI
│   │   │   ├── shared/ui/        Tooltip system, design-system components
│   │   │   └── _services/
│   │   │       ├── editor-grid.service.ts    Grid + snap + ruler state
│   │   │       └── theme.service.ts          Dark/light theme owner
│   │   ├── styles/
│   │   │   ├── _tokens.scss          ← --ds-* design tokens (single source of truth)
│   │   │   ├── _mixins.scss
│   │   │   └── design-system.scss    Global theming layer
│   │   ├── assets/
│   │   │   ├── i18n/             13 locales
│   │   │   └── lib/svgeditor/    Bundled svg-editor + custom-shapes.js
│   │   ├── theme.scss            Material light + dark themes
│   │   └── index.html            Pre-boot theme script (no FOUC)
│   └── dist/                     Pre-built bundle (committed for zero-build clones)
│
├── server/                       Node.js / Express backend
│   ├── main.js                   App entry
│   ├── api/                      REST endpoints (/api/daq, /api/devices, /api/users …)
│   ├── runtime/
│   │   ├── devices/              Protocol drivers (Modbus, OPC-UA, MQTT, S7 …)
│   │   ├── storage/
│   │   │   └── sqlite/           DAQ historian — see "Sensor data storage" below
│   │   ├── alarms/
│   │   ├── scripts/
│   │   └── …
│   ├── _appdata/                 SQLite project files (.fuxap.db)
│   ├── _db/                      DAQ time-series + currentTagReadings (auto-created)
│   ├── _widgets/                 SVG widget library (drop SVGs in subfolders to add)
│   └── _logs/
│
├── docs/
├── Dockerfile                    Multi-stage build (client + server + ODBC)
└── README.md                     ← you are here
```

### Sensor data storage

Time-series tag values land in `server/_db/` as SQLite files:

| File | Purpose |
|---|---|
| `daq-data_<deviceId>_<timestamp>.db` | Time-series readings, rotated every N hours (`settings.daqTokenizer`) |
| `daq-map_<deviceId>.db` | Tag-id ↔ name ↔ type mapping (so the time-series can store a dense INTEGER instead of a long name) |
| `currentTagReadings.db` | Single row per tag — latest value, for fast "what is X right now?" lookups |

REST endpoint: `GET /api/daq?tagid=X&from=...&to=...` — returns the rows used by chart widgets.

Drop SVG files into `server/_widgets/<GroupName>/` to add new symbols to the editor's Widgets palette (folder name becomes the section title in the sidebar).

---

## Running with Docker

A multi-stage `Dockerfile` is at the repo root:

```bash
docker build -t brandx:local .
docker run -d --name brandx -p 1881:1881 \
  -v $(pwd)/_appdata:/usr/src/app/FUXA/server/_appdata \
  -v $(pwd)/_db:/usr/src/app/FUXA/server/_db \
  -v $(pwd)/_widgets:/usr/src/app/FUXA/server/_widgets \
  brandx:local
```

Mounts persist the project DB, DAQ history, and widget library across container restarts.

---

## Deploying to GCP (production reference)

A live test deployment runs on a GCP Compute Engine VM. Reproduce with:

```bash
# 1. Auth + project
gcloud auth login --no-launch-browser
gcloud config set project <your-project-id>

# 2. Create a VM (4 vCPU / 16 GB / Mumbai)
gcloud compute instances create brandx-fuxa \
  --zone=asia-south1-a \
  --machine-type=e2-standard-4 \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --tags=brandx-fuxa

# 3. Open the firewall
gcloud compute firewall-rules create allow-brandx-1881 \
  --direction=INGRESS --action=ALLOW \
  --rules=tcp:1881 --source-ranges=0.0.0.0/0 \
  --target-tags=brandx-fuxa

# 4. SSH in, install Node + clone + start
gcloud compute ssh brandx-fuxa --zone=asia-south1-a --command='
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
  sudo apt-get install -y nodejs git build-essential python3 libsqlite3-dev
  sudo npm install -g pm2

  git clone -b feat/design-system https://github.com/Vatsal2401/Fuxa-extend.git ~/brandx
  cd ~/brandx/server && npm install
  pm2 start main.js --name brandx
  pm2 save
  pm2 startup systemd -u $USER --hp $HOME
'

# 5. Get the public IP
gcloud compute instances describe brandx-fuxa --zone=asia-south1-a \
  --format="value(networkInterfaces[0].accessConfigs[0].natIP)"
```

Browse to `http://<IP>:1881` — done. To stop / start the VM (save credit when idle):

```bash
gcloud compute instances stop  brandx-fuxa --zone=asia-south1-a
gcloud compute instances start brandx-fuxa --zone=asia-south1-a
```

---

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | Angular 18.2 (M2 API), Angular Material 18, RxJS, Angular CDK Overlay |
| Styling | SCSS + CSS custom properties (`--ds-*` token layer), `ngx-translate` |
| Visual editor | jQuery-based svg-editor (`assets/lib/svgeditor/fuxa-editor.min.js`) — owned canvas, Angular chrome around it |
| Backend | Node.js 18, Express |
| Storage | SQLite (project DB + DAQ historian — no external DB server) |
| Process mgr | `pm2` (production) / `nodemon` (dev) |
| Auth | JWT (built-in users module, optional) |
| Drivers | Modbus, OPC-UA, MQTT, Siemens S7, EthernetIP, custom Node-RED bridge |

---

## Useful npm scripts

In `client/`:

| Script | What |
|---|---|
| `npm start` | `ng serve` — Angular dev server on `:4200` with HMR |
| `npm run build` | Production build to `client/dist/` |
| `npm run watch` | Production build in watch mode |
| `npm test` | Karma + Jasmine tests |

In `server/`:

| Script | What |
|---|---|
| `npm start` | Production launch (`node main.js`) on `:1881` |
| `npm run dev` | `nodemon main.js` for live restart on file changes |
| `npm test` | Mocha test suite |

---

## Theme & branding

Every visible "FUXA" string was replaced with **`BrandX`** across:

- Browser tab title, loading splash
- Header brand badge, sidenav title, Help menu, tutorial title
- About dialog title (kept `Powered by FUXA · frangoteam` attribution)
- All 13 i18n locales: `en, de, es, fr, ja, ko, pt, ru, sv, tr, ua, zh-cn, zh-tw`

Internal identifiers (`window.fuxaScriptAPI`, npm package names, `.fuxap.db` project file extension) are **intentionally unchanged** so existing FUXA projects open without migration.

To swap the placeholder `BrandX` for your actual brand name:

```bash
find client/src -type f \( -name '*.json' -o -name '*.html' \) \
     -exec sed -i 's/BrandX/YourBrandName/g' {} +
cd client && npm run build
```

To replace the logo: drop your SVG at `client/src/assets/images/logo.svg` and your favicon at `client/src/favicon.ico`. No code change needed.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Native sqlite3 error on first `npm start` | `cd server && npm rebuild sqlite3 --build-from-source` |
| Editor canvas blank | The svg-editor lib needs port 1881 to serve `assets/lib/svgeditor/*` — make sure you're hitting the Node server, not `ng serve` directly |
| Theme stuck on dark or light | Open DevTools → Application → Local Storage → delete `fuxa.theme`, then reload |
| Old bundle served after pull | `cd client && npm run build` then hard refresh (Ctrl+Shift+R) |
| Plugins page Install button greyed | The plugin is already installed — that's the design |
| "Material Icons" not rendering | Run `npm install` in `client/` to ensure the `material-icons` npm package is present |

---

## Credit

Built on top of [FUXA](https://github.com/frangoteam/FUXA) by [frangoteam](https://github.com/frangoteam). MIT licensed.

---

# Original FUXA README follows

![fuxa logo](/client/src/favicon.ico)
## FUXA
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-online-brightgreen)](https://frangoteam.github.io/FUXA/)
[![Node](https://img.shields.io/badge/node-18%20LTS-green)](https://nodejs.org/)
[![GitHub stars](https://img.shields.io/github/stars/frangoteam/FUXA?style=flat)](https://github.com/frangoteam/FUXA/stargazers)
[![Docker Pulls](https://img.shields.io/docker/pulls/frangoteam/fuxa)](https://hub.docker.com/r/frangoteam/fuxa)
[![npm downloads](https://img.shields.io/npm/dt/%40frangoteam/fuxa?label=npm%20downloads)](https://www.npmjs.com/package/@frangoteam/fuxa)

FUXA is a **web-based SCADA / HMI platform** for industrial automation, IoT and real-time process visualization.

It allows you to build modern dashboards, connect industrial devices and monitor machines using standard industrial protocols such as **Modbus, OPC-UA, MQTT and Siemens S7**.

⭐ If you find FUXA useful, please consider giving the project a star.

![fuxa editor](/screenshot/fuxa-editor.png)

![fuxa ani](/screenshot/fuxa-thinglinks.gif)

![fuxa action](/screenshot/feature-action-move.gif)

## ✨ Features
- **Industrial protocol support**
  Modbus RTU/TCP, Siemens S7 Protocol, OPC-UA, BACnet IP, MQTT, Ethernet/IP (Allen Bradley), ODBC, ADSclient, Gpio (Raspberry), WebCam, MELSEC, Redis
- **Database and data storage**
  Built-in data historian (DAQ) with support for SQLite, InfluxDB and other time-series databases.
  External integrations via ODBC and Redis.
- **SCADA/HMI Web-Editor**
  Engineering and Design completely web-based
- **Cross-platform architecture**
  Backend: Node.js
  Frontend: Angular, HTML5, CSS, SVG

## Why FUXA

FUXA provides a modern **web-based platform for industrial monitoring, SCADA/HMI applications and IoT dashboards**.

It is designed to simplify the creation of real-time visualizations and industrial integrations using standard web technologies.

Key advantages:

- Modern **web-based SCADA / HMI architecture**
- Visual editor for dashboards and process visualization
- Support for industrial protocols (Modbus, OPC-UA, MQTT, Siemens S7 and more)
- Built with modern technologies (Node.js, Angular, SVG)
- Runs on **Linux, Windows, macOS, Docker, Raspberry Pi and more**
- Open-source and extensible

## 🚀 Live Demo
Here is a [live demo](https://frangoteam.github.io) example of FUXA editor.

## 📚 Documentation

Official documentation is available at:

👉 https://frangoteam.github.io/FUXA/

The documentation source is located in the `/docs` directory of this repository.

The site is built using MkDocs (Material theme) and automatically deployed via GitHub Actions.

## 🛠 Installing and Running
FUXA is developed with NodeJS (backend) and Angular (frontend).

For detailed guides and advanced configuration options, see the official documentation:

👉 https://frangoteam.github.io/FUXA/


### 1° Option - Running from docker
```
docker pull frangoteam/fuxa:latest
docker run -d -p 1881:1881 frangoteam/fuxa:latest

// persistent storage of application data (project), daq (tags history), logs and images (resource)
docker run -d -p 1881:1881 -v fuxa_appdata:/usr/src/app/FUXA/server/_appdata -v fuxa_db:/usr/src/app/FUXA/server/_db -v fuxa_logs:/usr/src/app/FUXA/server/_logs -v fuxa_images:/usr/src/app/FUXA/server/_images frangoteam/fuxa:latest

// with Docker compose
// persistent storage will be at ./appdata ./db ./logs and ./images
wget https://raw.githubusercontent.com/frangoteam/FUXA/master/compose.yml
docker compose up -d
```

Open up a browser (better Chrome) and navigate to http://localhost:1881

### 2° Option - Install from source
[Download the latest release](https://github.com/frangoteam/FUXA/releases) and unpack it

You need to have installed [Node.js](https://nodejs.org/en/about/previous-releases)
- Recommended: Node.js 18 LTS

**Note** Starting from FUXA 1.2.7, Node.js 14 and older versions are not supported due to upstream dependency updates.

**WARNING** On Linux systems (especially Raspberry Pi), installing native dependencies with Node.js 18 may require additional build tools.
If you do not intend to use specific features, you can safely remove them from ```server/package.json```:
- Remove ```node-snap7``` if you do not need Siemens S7 communication
- Remove ```odbc``` if you do not need external database connectivity

```
cd ./server
npm install
npm start
```

Open up a browser (better Chrome) and navigate to http://localhost:1881

### 3° Option - Install from [NPM](https://www.npmjs.com/package/@frangoteam/fuxa)

You need to have installed [Node.js](https://nodejs.org/en/about/previous-releases)
- Recommended: Node.js 18 LTS

**WARNING** In linux with nodejs Version 18 the installation could be a challenge.
If you don't intend communicate with Siemens PLCs via S7 (node-snap7 library) you can install from [NPM @frangoteam/fuxa-min](https://www.npmjs.com/package/@frangoteam/fuxa-min)

```
npm install -g --unsafe-perm @frangoteam/fuxa
fuxa
```

Open up a browser (better Chrome) and navigate to http://localhost:1881

### 4° Option - Install using prebuilt Electron Packages

You will need to be logged into github to access the download button for Electron Action Builds,
click on the workflow and scroll down to Artifacts and click the download icon for you system

[Electron Action Builds](https://github.com/frangoteam/FUXA/actions/workflows/electron_latest.yml)

<img width="2082" height="531" alt="image" src="https://github.com/user-attachments/assets/40f01e1d-cf39-4145-99a0-e8fedf791edf" />

### 5° Option - Headless Portable Binaries for Embedded Devices

For headless deployments on embedded devices or servers without GUI, FUXA provides self-contained portable binaries for Windows, macOS, and Linux.

These binaries include everything needed (server, client) and run as standalone executables.

Download the latest builds from GitHub Actions artifacts:

[Headless Portable Builds](https://github.com/frangoteam/FUXA/actions/workflows/headless_packaging.yml)

For detailed installation and running instructions, see the documentation.

### Creating the Electron Application
Electron is a framework for building cross-platform desktop applications using web technologies. An Electron application is standalone, meaning it can be run independently on your desktop without needing a web browser.

To create the Electron application, you need to have node.js 18 installed. Follow these steps:

Build Server and Client First
```
cd ./server
npm install
cd ../client
npm install
npm run build
```

Packaging
```
cd ./app
npm install
npm run package
```

After following these steps, you will have a standalone Electron application for FUXA. The application can be found in the ./app directory.

## Usage and Documentation
- 📚 Official Documentation: https://frangoteam.github.io/FUXA/
- Look video from [frangoteam](https://www.youtube.com/@umbertonocelli5301)
- Look video from [Fusion Automate - Urvish Nakum](https://youtube.com/playlist?list=PLxrSjjYyzaaK8uY3kVaFzfGnwhVXiCEAO&si=aU1OxgkUvLQ3bXHq)
- Browse the [DeepWiki](https://deepwiki.com/frangoteam/FUXA) for AI-assisted docs and code navigation

## Community SVG Widgets

Looking for ready-made, reusable SVG widgets?
Check out the companion repository **FUXA-SVG-Widgets**:

- Repository: https://github.com/frangoteam/FUXA-SVG-Widgets
- Authoring guide & examples: see the repo README and the Wiki page:
  https://github.com/frangoteam/FUXA/wiki/HowTo-Widgets

## 🧪 To Debug (Full Stack)
Install and start to serve the frontend
```
cd ./client
npm install
npm start
```

Start the Server and Client (Browser) in Debug Mode
```
In vscode: Debug ‘Server & Client’
```

## 🏗 To Build
Build the frontend for production
```
cd ./client
ng build --configuration=production
```

## Who uses FUXA

FUXA is used in industrial automation, IoT, monitoring and research environments.

### FUXA Pro

If you are using FUXA in production, consider supporting the development of the project by using **FUXA Pro**.**.

FUXA Pro includes additional professional features such as:

- White-label branding (custom logo and labels)
- Additional resources and templates
- User and script event logging
- Unlimited installations

The open-source version of FUXA remains fully available and continues to evolve with community contributions.

**License:** one-time payment – €100

More information:
https://frangoteam.org

## 🤝 Contributing

Contributions are welcome and greatly appreciated.

You can contribute by:

- Improving or fixing code
- Enhancing documentation
- Reporting bugs
- Proposing new features
- Sharing examples and use cases

Before submitting a Pull Request, please open an issue to discuss major changes.

For full contribution guidelines (code and documentation), please read:

👉 [CONTRIBUTING.md](CONTRIBUTING.md)

## 💬 Let us know!
We’d be really happy if you send us your own shapes in order to collect a library to share it with others. Just send an email to info@frangoteam.org and do let us know if you have any questions or suggestions regarding our work.

## <a href="https://discord.gg/WZhxz9uHh4" target="_blank" > <img src="https://skillicons.dev/icons?i=discord" alt=""></a>

## 📄 License
MIT.
