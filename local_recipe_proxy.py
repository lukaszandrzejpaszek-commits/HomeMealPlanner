"""Loopback-only recipe HTML fetcher for the locally opened app."""

import http.client
import ipaddress
import json
import re
import socket
import ssl
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urljoin, urlsplit, urlunsplit

HOST = "127.0.0.1"
PORT = 43987
MAX_REQUEST = 4096
MAX_RESPONSE = 2 * 1024 * 1024
MAX_REDIRECTS = 5


class ProxyError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def validated_target(url):
    try:
        parts = urlsplit(url)
        port = parts.port
        hostname = parts.hostname
    except ValueError as error:
        raise ProxyError("Invalid recipe URL.") from error
    if (parts.scheme.lower() != "https" or not hostname or parts.username or
            parts.password or port not in (None, 443)):
        raise ProxyError("Recipe URLs must use HTTPS without credentials or a nonstandard port.")
    hostname = hostname.lower().rstrip(".")
    if (len(hostname) > 253 or not re.fullmatch(r"[a-z0-9.-]+", hostname) or
            "." not in hostname or hostname.endswith((".local", ".localhost")) or
            any(not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label)
                for label in hostname.split("."))):
        raise ProxyError("This recipe host is not allowed.", 403)
    try:
        ipaddress.ip_address(hostname)
    except ValueError:
        pass
    else:
        raise ProxyError("IP address recipe URLs are not allowed.", 403)
    try:
        addresses = socket.getaddrinfo(hostname, 443, type=socket.SOCK_STREAM)
    except socket.gaierror as error:
        raise ProxyError("The recipe host could not be resolved.", 502) from error
    if not addresses or any(not ipaddress.ip_address(item[4][0]).is_global for item in addresses):
        raise ProxyError("The recipe host must resolve to public addresses.", 403)
    target = urlunsplit(("https", hostname, parts.path or "/", parts.query, ""))
    return target, hostname, addresses[0][4][0]


def fetch_recipe(url):
    for redirects in range(MAX_REDIRECTS + 1):
        target, hostname, address = validated_target(url)
        connection = http.client.HTTPSConnection(hostname, timeout=15, context=ssl.create_default_context())
        # Pin the validated address while retaining the hostname for TLS verification.
        connection._create_connection = lambda *args, **kwargs: socket.create_connection((address, 443), timeout=15)
        try:
            parts = urlsplit(target)
            path = urlunsplit(("", "", parts.path, parts.query, ""))
            connection.request("GET", path, headers={"Accept": "text/html,application/xhtml+xml", "User-Agent": "Mozilla/5.0"})
            response = connection.getresponse()
            if response.status in (301, 302, 303, 307, 308):
                location = response.getheader("Location")
                if not location or redirects == MAX_REDIRECTS:
                    raise ProxyError("The recipe page has an invalid or excessive redirect.", 502)
                url = urljoin(target, location)
                continue
            if response.status != 200:
                raise ProxyError(f"The recipe website returned {response.status}.", 502)
            content_type = response.getheader("Content-Type", "")
            if not re.match(r"^(text/html|application/xhtml\+xml)(?:\s*;|$)", content_type, re.I):
                raise ProxyError("The linked page did not return HTML.", 415)
            data = response.read(MAX_RESPONSE + 1)
            if len(data) > MAX_RESPONSE:
                raise ProxyError("The recipe page is larger than the allowed size.", 413)
            charset = response.headers.get_content_charset() or "utf-8"
            try:
                html = data.decode(charset, errors="replace")
            except LookupError as error:
                raise ProxyError("The recipe page uses an unsupported character encoding.", 502) from error
            return {"html": html, "finalUrl": target}
        except (OSError, http.client.HTTPException) as error:
            raise ProxyError(f"Could not fetch the recipe website: {error}", 502) from error
        finally:
            connection.close()
    raise ProxyError("The recipe page redirected too many times.", 502)


class Handler(BaseHTTPRequestHandler):
    def allowed_request(self):
        return (self.path == "/recipe" and
                self.headers.get("Host") == f"{HOST}:{PORT}" and
                self.headers.get("Origin", "null") == "null")

    def send_json(self, status, body, cors=False):
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        if cors:
            self.send_header("Access-Control-Allow-Origin", "null")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        if not self.allowed_request():
            return self.send_json(403, {"error": "Origin or host not allowed."})
        self.send_json(200, {}, cors=True)

    def do_POST(self):
        if not self.allowed_request():
            return self.send_json(403, {"error": "Origin or host not allowed."})
        if self.headers.get_content_type() != "application/json":
            return self.send_json(415, {"error": "Send the recipe URL as JSON."}, cors=True)
        try:
            length = int(self.headers.get("Content-Length", ""))
            if length < 0 or length > MAX_REQUEST:
                raise ProxyError("The request is too large.", 413)
            body = json.loads(self.rfile.read(length))
            if not isinstance(body, dict) or not isinstance(body.get("url"), str):
                raise ProxyError("A recipe URL is required.")
            result = fetch_recipe(body["url"])
            self.send_json(200, result, cors=True)
        except (ValueError, UnicodeDecodeError):
            self.send_json(400, {"error": "Send a valid JSON object containing a recipe URL."}, cors=True)
        except ProxyError as error:
            self.send_json(error.status, {"error": str(error)}, cors=True)


class LocalServer(ThreadingHTTPServer):
    allow_reuse_address = False


if __name__ == "__main__":
    server = LocalServer((HOST, PORT), Handler)
    print(f"Recipe proxy running on http://{HOST}:{PORT}/recipe. Keep this window open.", flush=True)
    server.serve_forever()
