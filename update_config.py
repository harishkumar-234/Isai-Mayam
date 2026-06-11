import os
import json

# Path to the songs folder (relative to this script)
SONGS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'songs')
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'songs-config.js')

# Supported audio file extensions
AUDIO_EXTENSIONS = {'.mp3', '.mpeg', '.m4a', '.wav', '.ogg', '.flac', '.aac'}

def scan_songs():
    config = []

    if not os.path.exists(SONGS_DIR):
        print(f'[!] songs/ folder not found at: {SONGS_DIR}')
        return config

    # 1. Scan root level files first (standalone songs)
    root_songs = []
    for filename in sorted(os.listdir(SONGS_DIR)):
        file_path = os.path.join(SONGS_DIR, filename)
        if os.path.isfile(file_path):
            ext = os.path.splitext(filename)[1].lower()
            if ext in AUDIO_EXTENSIONS:
                root_songs.append(filename)
    
    if root_songs:
        config.append({
            'movie': '',
            'songs': root_songs
        })
        print(f'[+] Root folder: {len(root_songs)} standalone song(s) found')

    # 2. Scan subdirectories (movie folders)
    for folder_name in sorted(os.listdir(SONGS_DIR)):
        folder_path = os.path.join(SONGS_DIR, folder_name)

        # Skip files at root level (only look at movie folders)
        if not os.path.isdir(folder_path):
            continue

        songs = []
        for filename in sorted(os.listdir(folder_path)):
            ext = os.path.splitext(filename)[1].lower()
            if ext in AUDIO_EXTENSIONS:
                songs.append(filename)

        if songs:
            config.append({
                'movie': folder_name,
                'songs': songs
            })
            print(f'[+] {folder_name}: {len(songs)} song(s) found')

    return config

def write_config(config):
    lines = []
    lines.append('/**')
    lines.append(' * ============================================================')
    lines.append(' *  SoundWave — Songs Configuration (Auto-Generated)')
    lines.append(' *  Run UPDATE_CONFIG.bat to regenerate this file.')
    lines.append(' * ============================================================')
    lines.append(' */')
    lines.append('')
    lines.append('const SONGS_CONFIG = [')
    lines.append('')

    for i, entry in enumerate(config):
        lines.append(f'  {{')
        lines.append(f'    movie: {json.dumps(entry["movie"])},')
        lines.append(f'    songs: [')
        for song in entry['songs']:
            lines.append(f'      {json.dumps(song)},')
        lines.append(f'    ]')
        comma = ',' if i < len(config) - 1 else ''
        lines.append(f'  }}{comma}')
        lines.append('')

    lines.append('];')
    lines.append('')

    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f'\n[OK] songs-config.js updated with {len(config)} category/folder entry(ies).')

if __name__ == '__main__':
    print('SoundWave — Auto Config Generator')
    print('=' * 40)
    config = scan_songs()
    if config:
        write_config(config)
    else:
        print('[!] No audio files found in songs/ or its subfolders.')
    print('')
    input('Press Enter to close...')
