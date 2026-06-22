#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
帝斯曼财务仪表盘 · 局域网共享服务器（带自动同步 / 自动刷新）

作用：
  1) 在本机启动后，同一 WiFi / 局域网内的其他设备（手机、电脑）
     可以通过浏览器访问 http://<本机IP>:8000 看到仪表盘。
  2) 当你更新本目录里的 index.html（或其他文件）后，
     所有已经打开页面的人会“自动刷新”，无需手动按 F5。

特点：
  - 零依赖：只用 Python 3 标准库，不需要联网、不需要 pip 安装任何东西。
  - 离线可用：图表库 chart.umd.js 已放在本目录，断网也能正常显示。

用法：
  python serve.py            # 默认端口 8000
  PORT=9000 python serve.py  # 自定义端口（Windows: set PORT=9000 再运行）
关闭：在本窗口按 Ctrl+C。
"""
import os
import sys
import time
import socket
import threading
import http.server
import socketserver

PORT = int(os.environ.get("PORT", "8000"))
ROOT = os.path.dirname(os.path.abspath(__file__))
INDEX = "index.html"
SELF = os.path.basename(os.path.abspath(__file__))

# 注入到每个 HTML 页面里的“自动刷新”脚本（通过 SSE 监听服务器通知）
LIVE_JS = b"""
<script>
/* live-reload injected by serve.py */
(function(){
  function connect(){
    try{
      var es = new EventSource('/__livereload');
      es.addEventListener('reload', function(){ location.reload(); });
      es.onerror = function(){ try{es.close();}catch(e){} setTimeout(connect, 1500); };
    }catch(e){ setTimeout(connect, 2000); }
  }
  connect();
})();
</script>
"""

# 版本号 + 条件变量：文件变化时 version+1 并唤醒所有 SSE 连接线程
_cond = threading.Condition()
_version = 0


def watcher():
    """轮询本目录文件改动；有变化就提升版本号并通知所有客户端。"""
    global _version
    last = {}
    first = True
    while True:
        try:
            changed = False
            for name in os.listdir(ROOT):
                if name.startswith('.') or name == SELF:
                    continue
                p = os.path.join(ROOT, name)
                if not os.path.isfile(p):
                    continue
                try:
                    sig = (os.path.getmtime(p), os.path.getsize(p))
                except OSError:
                    continue
                if p not in last:
                    last[p] = sig
                elif sig != last[p]:
                    last[p] = sig
                    changed = True
            if changed and not first:
                with _cond:
                    _version += 1
                    _cond.notify_all()
            first = False
        except Exception:
            pass
        time.sleep(1)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, fmt, *args):
        pass  # 安静模式，不刷屏

    def do_GET(self):
        path = self.path.split('?', 1)[0]

        # SSE 自动刷新通道
        if path == '/__livereload':
            return self.handle_sse()

        # 首页或任意 .html：注入自动刷新脚本后返回
        if path in ('/', '/' + INDEX):
            return self.serve_html(os.path.join(ROOT, INDEX))
        local = os.path.join(ROOT, path.lstrip('/'))
        if path.endswith('.html') and os.path.isfile(local):
            return self.serve_html(local)

        # 其他静态文件（chart.umd.js 等）走默认处理
        return super().do_GET()

    def handle_sse(self):
        try:
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b": connected\n\n")
            self.wfile.flush()
        except Exception:
            return
        last_seen = _version
        # 仅由“本连接所在线程”写自己的连接，避免多线程写串流
        while True:
            with _cond:
                _cond.wait(timeout=15)
                v = _version
            try:
                if v != last_seen:
                    last_seen = v
                    self.wfile.write(b"event: reload\ndata: %d\n\n" % v)
                else:
                    self.wfile.write(b": ping\n\n")  # 保活
                self.wfile.flush()
            except Exception:
                break  # 客户端断开

    def serve_html(self, fpath):
        try:
            with open(fpath, 'rb') as f:
                data = f.read()
        except OSError:
            self.send_error(404)
            return
        if b'</body>' in data:
            data = data.replace(b'</body>', LIVE_JS + b'</body>', 1)
        else:
            data = data + LIVE_JS
        try:
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)
        except Exception:
            pass


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def lan_ips():
    ips = []
    seen = set()

    def add(ip):
        if ip and not ip.startswith('127.') and ip not in seen:
            seen.add(ip)
            ips.append(ip)

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        add(s.getsockname()[0])
        s.close()
    except Exception:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            add(info[4][0])
    except Exception:
        pass
    return ips


def main():
    threading.Thread(target=watcher, daemon=True).start()
    try:
        httpd = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    except OSError as e:
        print("端口 %d 启动失败：%s" % (PORT, e))
        print("可能是端口被占用。请换个端口重试，例如：PORT=8080 python serve.py")
        sys.exit(1)

    ips = lan_ips()
    bar = "=" * 56
    print(bar)
    print(" 帝斯曼财务仪表盘 · 局域网共享已启动")
    print(bar)
    print(" 本机打开：      http://localhost:%d" % PORT)
    if ips:
        print(" 同一 WiFi 的其他设备（手机/电脑）打开：")
        for ip in ips:
            print("      http://%s:%d" % (ip, PORT))
    else:
        print(" 未检测到局域网 IP，请确认本机已连接 WiFi/网线。")
    print(bar)
    print(" · 把上面的网址发给同事，连同一个 WiFi 即可打开")
    print(" · 你用新的 index.html 覆盖本目录后，对方页面会自动刷新")
    print(" · 停止共享：在本窗口按 Ctrl+C")
    print(bar)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止共享。")


if __name__ == "__main__":
    main()
