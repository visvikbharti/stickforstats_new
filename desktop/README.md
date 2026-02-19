# StickForStats Desktop

Native desktop application built with Tauri. Wraps the React frontend for a lightweight (~5MB) native experience.

## Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Node.js](https://nodejs.org/) (v18+)
- Platform-specific dependencies:
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Visual Studio Build Tools, WebView2
  - **Linux**: `webkit2gtk-4.0`, `libappindicator3-1`

## Development

```bash
# Install Tauri CLI
cargo install tauri-cli

# Run in development mode (hot reload)
cd desktop
cargo tauri dev

# Build production release
cargo tauri build
```

## Features

- Native file dialogs for data import/export
- System notifications for long-running analyses
- Auto-updater for new versions
- ~5MB binary (vs ~150MB for Electron)
- Full access to StickForStats features
- Works offline with local backend

## Architecture

```
desktop/
├── src-tauri/
│   ├── tauri.conf.json   # Tauri configuration
│   ├── Cargo.toml        # Rust dependencies
│   ├── src/
│   │   └── main.rs       # Native commands + app setup
│   └── icons/            # App icons (generated via cargo tauri icon)
└── README.md
```
