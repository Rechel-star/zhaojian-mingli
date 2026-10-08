from http.server import BaseHTTPRequestHandler

from backend import MODEL, configured, json_bytes


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json_bytes({
            "ok": True,
            "configured": configured(),
            "provider": "OpenAI-compatible",
            "model": MODEL if configured() else "",
        })
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
