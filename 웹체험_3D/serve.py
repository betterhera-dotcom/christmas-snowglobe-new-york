"""Local-only server and launcher. No third-party Python packages required."""
import http.server
import os
from pathlib import Path
import subprocess
import sys
import urllib.request

ROOT = Path(__file__).resolve().parent
PORT = 8877
os.chdir(ROOT)

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript', '.wasm': 'application/wasm'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Snowglobe-Version', '3d-v05')
        super().end_headers()

try:
    server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
except OSError as error:
    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{PORT}', timeout=2) as response:
            same = response.headers.get('X-Snowglobe-Version') == '3d-v05'
        if same:
            if '--no-open' not in sys.argv:
                subprocess.run(['open', '-a', 'Google Chrome', f'http://127.0.0.1:{PORT}'], check=False)
            print('기존 3D 스노우볼 실행 창을 사용합니다.')
            sys.exit(0)
    except (OSError, ValueError):
        pass
    print(f'로컬 서버를 시작하지 못했습니다: {error}\n기존 실행 창 또는 실행 권한을 확인해주세요.')
    sys.exit(1)
url = f'http://127.0.0.1:{PORT}'
print(f'스노우볼 실행: {url}\n이 창을 열어두세요. 종료: Control + C', flush=True)
if '--no-open' not in sys.argv:
    subprocess.run(['open', '-a', 'Google Chrome', url], check=False)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
