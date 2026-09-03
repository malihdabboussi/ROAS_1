#!/usr/bin/env python3

import argparse
import http.server
from pathlib import Path


class FixtureHandler(http.server.SimpleHTTPRequestHandler):
    state_dir: Path

    def do_GET(self):  # noqa: N802
        if self.path == "/redirect":
            self.send_response(302)
            self.send_header("Location", "http://localhost.evil.test/")
            self.end_headers()
            return
        if self.path == "/userinfo":
            self.send_response(302)
            self.send_header("Location", "http://user@localhost:8765/fixture.html")
            self.end_headers()
            return
        super().do_GET()

    def do_POST(self):  # noqa: N802
        if self.path != "/hit":
            self.send_error(404)
            return
        hits_path = self.state_dir / "hits.txt"
        try:
            hits = int(hits_path.read_text(encoding="utf-8").strip() or "0")
        except (FileNotFoundError, ValueError):
            hits = 0
        hits_path.write_text(f"{hits + 1}\n", encoding="utf-8")
        self.send_response(204)
        self.end_headers()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", required=True)
    parser.add_argument("--state-dir", required=True)
    args = parser.parse_args()
    FixtureHandler.state_dir = Path(args.state_dir)
    handler = lambda *handler_args, **kwargs: FixtureHandler(  # noqa: E731
        *handler_args, directory=args.directory, **kwargs
    )
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 8765), handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
