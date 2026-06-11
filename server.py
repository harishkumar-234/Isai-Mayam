import os
import time
import threading
import http.server
import socketserver
import webbrowser
from update_config import scan_songs, write_config

PORT = 8000

def get_songs_state():
    """
    Computes a state hash/tuple based on the modification times of the songs directory 
    and all of its subfolders and audio files.
    """
    songs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'songs')
    if not os.path.exists(songs_dir):
        return (0, 0)
    
    total_mtime = os.path.getmtime(songs_dir)
    audio_extensions = {'.mp3', '.mpeg', '.m4a', '.wav', '.ogg', '.flac', '.aac'}
    total_items = 0
    
    for root, dirs, files in os.walk(songs_dir):
        total_items += len(dirs) + len(files)
        # Check directory mtimes
        for d in dirs:
            dir_path = os.path.join(root, d)
            try:
                total_mtime = max(total_mtime, os.path.getmtime(dir_path))
            except OSError:
                pass
        # Check audio file mtimes
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in audio_extensions:
                file_path = os.path.join(root, f)
                try:
                    total_mtime = max(total_mtime, os.path.getmtime(file_path))
                except OSError:
                    pass
                
    return (total_mtime, total_items)

def watch_songs_directory():
    """
    Background worker that polls the songs directory for changes every 2 seconds.
    """
    last_state = get_songs_state()
    while True:
        time.sleep(2)
        current_state = get_songs_state()
        if current_state != last_state:
            print("\n[Watcher] Changes detected in songs/ directory! Regenerating songs-config.js...")
            try:
                config = scan_songs()
                if config:
                    write_config(config)
                last_state = current_state
            except Exception as e:
                print(f"[Watcher] Failed to regenerate configuration: {e}")

class AutoUpdateHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Trigger config regeneration on page/config load
        clean_path = self.path.split('?')[0].split('#')[0]
        if clean_path in ['', '/', '/index.html', '/songs-config.js']:
            try:
                config = scan_songs()
                if config:
                    write_config(config)
            except Exception as e:
                print(f"[!] Request-triggered configuration update failed: {e}")
        return super().do_GET()

    def end_headers(self):
        # Disable caching for JS, CSS, and HTML so changes are always picked up immediately
        if self.path.endswith(('.js', '.css', '.html')) or self.path in ['/', '']:
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        # Suppress 404 for favicon to keep console clean
        if '404' in str(args) and 'favicon' in str(args):
            return
        super().log_message(format, *args)

if __name__ == '__main__':
    # Ensure working directory is the script's directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Run a initial scan on startup
    print("Isai Mayam Local Server — Initializing...")
    try:
        config = scan_songs()
        if config:
            write_config(config)
    except Exception as e:
        print(f"[!] Initial startup scan failed: {e}")

    # Start the background folder watcher thread
    watcher_thread = threading.Thread(target=watch_songs_directory, daemon=True)
    watcher_thread.start()
    print("[Watcher] Background folder watcher started.")

    # Configure and start HTTP Server
    handler = AutoUpdateHandler
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"\nIsai Mayam Local Server started on http://localhost:{PORT}")
        print("Press Ctrl+C to stop the server.")
        
        # Open browser automatically
        webbrowser.open(f"http://localhost:{PORT}")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping server...")
