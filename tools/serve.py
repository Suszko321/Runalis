"""Local-only preview server with fresh module loading. python tools/serve.py [port]"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from functools import partial
import sys

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

port=int(sys.argv[1]) if len(sys.argv)>1 else 8766
root=Path(__file__).resolve().parents[1]
print(f'Runalis preview: http://127.0.0.1:{port}',flush=True)
ThreadingHTTPServer(('127.0.0.1',port),partial(Handler,directory=str(root))).serve_forever()
