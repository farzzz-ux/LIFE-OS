use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

/// Get the designated backup directory inside app_data_dir (%LOCALAPPDATA%/com.lifeos.desktop/backups)
fn get_backup_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;
    let backup_dir = base_dir.join("backups");
    if !backup_dir.exists() {
        fs::create_dir_all(&backup_dir)
            .map_err(|e| format!("Failed to create backup directory: {}", e))?;
    }
    Ok(backup_dir)
}

/// Native command to persist a redundant JSON backup of the user state to disk
#[tauri::command]
fn save_backup(app: tauri::AppHandle, state_json: String) -> Result<String, String> {
    if state_json.trim().is_empty() {
        return Err("State JSON is empty".to_string());
    }

    let backup_dir = get_backup_dir(&app)?;
    let latest_file = backup_dir.join("lifeos-latest-backup.json");
    fs::write(&latest_file, &state_json)
        .map_err(|e| format!("Failed to write latest backup: {}", e))?;

    Ok(latest_file.to_string_lossy().to_string())
}

/// Native command to read the latest backup if localStorage needs recovery
#[tauri::command]
fn get_latest_backup(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let backup_dir = get_backup_dir(&app)?;
    let latest_file = backup_dir.join("lifeos-latest-backup.json");
    if latest_file.exists() {
        let content = fs::read_to_string(&latest_file)
            .map_err(|e| format!("Failed to read latest backup: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

/// Native command to safely open external links in default Windows browser
#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    let trimmed = url.trim();
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") || trimmed.starts_with("mailto:") {
        Command::new("cmd")
            .args(["/C", "start", "", trimmed])
            .spawn()
            .map_err(|e| format!("Failed to launch default browser: {}", e))?;
        Ok(())
    } else {
        Err("Invalid URL scheme; only http, https, and mailto are permitted".to_string())
    }
}

const DESKTOP_INJECTION_SCRIPT: &str = r#"
(function() {
  // 1. Prevent accidental reload/print accelerator keys
  window.addEventListener('keydown', function(e) {
    if (e.key === 'F5' || (e.ctrlKey && (e.key === 'r' || e.key === 'R' || e.key === 'p' || e.key === 'P'))) {
      if (!e.metaKey && !e.altKey) {
        e.preventDefault();
      }
    }
  }, false);

  // 2. Disable default browser context menu in production while keeping custom right-clicks intact
  window.addEventListener('contextmenu', function(e) {
    var target = e.target;
    var isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    if (!isInput && !target.closest('.custom-context-menu') && !target.closest('[data-custom-context]')) {
      e.preventDefault();
    }
  }, false);

  // 3. Route external links to native Windows browser
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href) return;

    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
      try {
        var url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) {
          e.preventDefault();
          e.stopPropagation();
          if (window.__TAURI__ && window.__TAURI__.core) {
            window.__TAURI__.core.invoke('open_external', { url: href });
          }
        }
      } catch (_) {}
    }
  }, true);

  // 4. Background native silent backup sync (every 60s)
  function triggerNativeBackup() {
    try {
      if (typeof localStorage === 'undefined') return;
      var raw = localStorage.getItem('life_os_state_v6');
      if (raw && window.__TAURI__ && window.__TAURI__.core) {
        window.__TAURI__.core.invoke('save_backup', { stateJson: raw });
      }
    } catch (_) {}
  }

  // Initial attempt to recover if localStorage is unexpectedly empty on fresh install / clear
  window.addEventListener('DOMContentLoaded', function() {
    try {
      if (typeof localStorage !== 'undefined' && !localStorage.getItem('life_os_state_v6')) {
        if (window.__TAURI__ && window.__TAURI__.core) {
          window.__TAURI__.core.invoke('get_latest_backup').then(function(backup) {
            if (backup && typeof backup === 'string' && backup.length > 20) {
              localStorage.setItem('life_os_state_v6', backup);
              console.log('[LIFE OS Desktop] Restored state from native backup.');
              window.location.reload();
            }
          });
        }
      }
    } catch (_) {}
  });

  setInterval(triggerNativeBackup, 60000);
  window.addEventListener('beforeunload', triggerNativeBackup);
})();
"#;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            save_backup,
            get_latest_backup,
            open_external
        ])
        .setup(|app| {
            // Configure System Tray
            let show_item = MenuItemBuilder::with_id("show", "Open LIFE OS").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app)
                .items(&[&show_item, &quit_item])
                .build()?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("LIFE OS — Command Center")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Configure main window and inject desktop bridge
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.eval(DESKTOP_INJECTION_SCRIPT);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
