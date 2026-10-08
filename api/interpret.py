import hashlib
import json
from http.server import BaseHTTPRequestHandler

from backend import MAX_BODY_BYTES, clean_payload, configured, json_bytes, request_model


class handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if not configured():
            self.send_json(503, {"error": "后端模型尚未配置"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY_BYTES:
                raise ValueError("请求体大小不正确")
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(data, dict):
                raise ValueError("请求格式不正确")
            payload = clean_payload(data)
            content = request_model(payload)
            self.send_json(200, {
                "content": content,
                "cached": False,
                "requestId": hashlib.sha256(json_bytes(payload)).hexdigest()[:12],
            })
        except (ValueError, json.JSONDecodeError) as exc:
            self.send_json(400, {"error": str(exc)})
        except RuntimeError as exc:
            self.send_json(502, {"error": str(exc)})
        except Exception:
            self.send_json(500, {"error": "服务器处理失败，请稍后重试"})
