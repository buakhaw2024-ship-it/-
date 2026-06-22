#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
帝斯曼财务仪表盘 · 局域网共享服务器（自动同步 + 启动二维码）

作用：
  1) 在本机启动后，同一 WiFi / 局域网内的其他设备（手机、电脑）
     可以通过浏览器访问 http://<本机IP>:8000 看到仪表盘。
  2) 启动时直接在窗口里打印**二维码**，同事用手机扫一下即可打开
     （扫码仍需和主机在同一个 WiFi/局域网）。
  3) 当你更新本目录里的 index.html（或其他文件）后，
     所有已经打开页面的人会“自动刷新”，无需手动按 F5。

特点：
  - 零依赖：只用 Python 3 标准库，二维码也是本地离线生成，
    不需要联网、不需要 pip 安装任何东西。
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

# =========================================================================
# 纯标准库二维码生成（字节模式，纠错等级 M，版本 1-6；离线，无需任何依赖）
# 已通过 OpenCV 解码与 segno 矩阵交叉校验。
# =========================================================================
_QR_EC = {1: (10, [(1, 16)]), 2: (16, [(1, 28)]), 3: (26, [(1, 44)]),
          4: (18, [(2, 32)]), 5: (24, [(2, 43)]), 6: (16, [(4, 27)])}
_QR_ALIGN = {1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34]}
_QR_REM = {1: 0, 2: 7, 3: 7, 4: 7, 5: 7, 6: 7}

_EXP = [0] * 512
_LOG = [0] * 256
_x = 1
for _i in range(255):
    _EXP[_i] = _x
    _LOG[_x] = _i
    _x <<= 1
    if _x & 0x100:
        _x ^= 0x11D
for _i in range(255, 512):
    _EXP[_i] = _EXP[_i - 255]


def _gmul(a, b):
    if a == 0 or b == 0:
        return 0
    return _EXP[_LOG[a] + _LOG[b]]


def _rs_gen(n):
    g = [1]
    for i in range(n):
        ng = [0] * (len(g) + 1)
        for j in range(len(g)):
            ng[j] ^= g[j]
            ng[j + 1] ^= _gmul(g[j], _EXP[i])
        g = ng
    return g


def _rs_ec(data, n):
    g = _rs_gen(n)
    res = list(data) + [0] * n
    for i in range(len(data)):
        c = res[i]
        if c:
            for j in range(len(g)):
                res[i + j] ^= _gmul(g[j], c)
    return res[len(data):]


def _qr_format(mask):
    data = (0 << 3) | mask  # 纠错等级 M 的 formatbits = 0
    rem = data
    for _ in range(10):
        rem = (rem << 1) ^ ((rem >> 9) * 0x537)
    return ((data << 10) | rem) ^ 0x5412


def _qr_fmt_pos(size):
    c1 = [(i, 8) for i in range(6)] + [(7, 8), (8, 8), (8, 7)] + [(8, 14 - i) for i in range(9, 15)]
    c2 = [(8, size - 1 - i) for i in range(8)] + [(size - 15 + i, 8) for i in range(8, 15)]
    return c1, c2


def _qr_mask(m, r, c):
    if m == 0: return (r + c) % 2 == 0
    if m == 1: return r % 2 == 0
    if m == 2: return c % 3 == 0
    if m == 3: return (r + c) % 3 == 0
    if m == 4: return (r // 2 + c // 3) % 2 == 0
    if m == 5: return (r * c) % 2 + (r * c) % 3 == 0
    if m == 6: return ((r * c) % 2 + (r * c) % 3) % 2 == 0
    return ((r + c) % 2 + (r * c) % 3) % 2 == 0


def _qr_version(n):
    for v in range(1, 7):
        ec, blocks = _QR_EC[v]
        D = sum(b * k for b, k in blocks)
        if 4 + 8 + 8 * n <= D * 8:
            return v
    raise ValueError("data too long")


def _qr_bits(data, version):
    ec, blocks = _QR_EC[version]
    D = sum(b * k for b, k in blocks)
    bits = []

    def put(val, nn):
        for i in range(nn - 1, -1, -1):
            bits.append((val >> i) & 1)

    put(0b0100, 4)
    put(len(data), 8)
    for b in data:
        put(b, 8)
    cap = D * 8
    for _ in range(min(4, cap - len(bits))):
        bits.append(0)
    while len(bits) % 8:
        bits.append(0)
    pads = [0xEC, 0x11]
    pi = 0
    while len(bits) < cap:
        put(pads[pi % 2], 8)
        pi += 1
    dcw = [int(''.join(map(str, bits[i:i + 8])), 2) for i in range(0, len(bits), 8)]
    dblocks = []
    eblocks = []
    idx = 0
    for nb, k in blocks:
        for _ in range(nb):
            blk = dcw[idx:idx + k]
            idx += k
            dblocks.append(blk)
            eblocks.append(_rs_ec(blk, ec))
    msg = []
    for i in range(max(len(b) for b in dblocks)):
        for b in dblocks:
            if i < len(b):
                msg.append(b[i])
    for i in range(max(len(b) for b in eblocks)):
        for b in eblocks:
            if i < len(b):
                msg.append(b[i])
    out = []
    for cw in msg:
        for i in range(7, -1, -1):
            out.append((cw >> i) & 1)
    out += [0] * _QR_REM[version]
    return out


def _qr_skeleton(version):
    size = 17 + 4 * version
    mod = [[0] * size for _ in range(size)]
    func = [[False] * size for _ in range(size)]

    def sf(r, c, d):
        if 0 <= r < size and 0 <= c < size:
            mod[r][c] = 1 if d else 0
            func[r][c] = True

    def finder(r, c):
        for dr in range(-1, 8):
            for dc in range(-1, 8):
                d = (0 <= dr <= 6 and dc in (0, 6)) or (0 <= dc <= 6 and dr in (0, 6)) or (2 <= dr <= 4 and 2 <= dc <= 4)
                sf(r + dr, c + dc, d)

    finder(0, 0)
    finder(0, size - 7)
    finder(size - 7, 0)
    for i in range(size):
        if not func[6][i]:
            sf(6, i, i % 2 == 0)
        if not func[i][6]:
            sf(i, 6, i % 2 == 0)
    co = _QR_ALIGN[version]
    for r in co:
        for c in co:
            if func[r][c]:
                continue
            for dr in range(-2, 3):
                for dc in range(-2, 3):
                    sf(r + dr, c + dc, max(abs(dr), abs(dc)) != 1)
    c1, c2 = _qr_fmt_pos(size)
    for (r, c) in c1 + c2:
        func[r][c] = True
        mod[r][c] = 0
    func[size - 8][8] = True
    mod[size - 8][8] = 1  # 固定黑点
    return mod, func, size


def _qr_place(mod, func, bits, size):
    i = 0
    col = size - 1
    up = True
    while col > 0:
        if col == 6:
            col -= 1
        for t in range(size):
            r = (size - 1 - t) if up else t
            for c in (col, col - 1):
                if not func[r][c]:
                    mod[r][c] = bits[i] if i < len(bits) else 0
                    i += 1
        up = not up
        col -= 2


def _qr_apply(mod, func, mask, size):
    m = [row[:] for row in mod]
    for r in range(size):
        for c in range(size):
            if not func[r][c] and _qr_mask(mask, r, c):
                m[r][c] ^= 1
    return m


def _qr_draw_fmt(m, mask, size):
    bits = _qr_format(mask)
    c1, c2 = _qr_fmt_pos(size)
    for idx, (r, c) in enumerate(c1):
        m[r][c] = (bits >> idx) & 1
    for idx, (r, c) in enumerate(c2):
        m[r][c] = (bits >> idx) & 1
    m[size - 8][8] = 1


def _qr_penalty(m, size):
    s = 0
    for i in range(size):
        run = 1
        for j in range(1, size):
            if m[i][j] == m[i][j - 1]:
                run += 1
            else:
                if run >= 5:
                    s += 3 + (run - 5)
                run = 1
        if run >= 5:
            s += 3 + (run - 5)
        run = 1
        for j in range(1, size):
            if m[j][i] == m[j - 1][i]:
                run += 1
            else:
                if run >= 5:
                    s += 3 + (run - 5)
                run = 1
        if run >= 5:
            s += 3 + (run - 5)
    for i in range(size - 1):
        for j in range(size - 1):
            if m[i][j] == m[i][j + 1] == m[i + 1][j] == m[i + 1][j + 1]:
                s += 3
    p1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]
    p2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]
    for i in range(size):
        for j in range(size - 10):
            if [m[i][j + k] for k in range(11)] in (p1, p2):
                s += 40
            if [m[j + k][i] for k in range(11)] in (p1, p2):
                s += 40
    dark = sum(sum(r) for r in m)
    total = size * size
    s += (abs(dark * 100 // total - 50) // 5) * 10
    return s


def qr_matrix(text):
    data = text.encode('utf-8')
    version = _qr_version(len(data))
    bits = _qr_bits(data, version)
    mod, func, size = _qr_skeleton(version)
    _qr_place(mod, func, bits, size)
    best = None
    for mask in range(8):
        m = _qr_apply(mod, func, mask, size)
        _qr_draw_fmt(m, mask, size)
        p = _qr_penalty(m, size)
        if best is None or p < best[0]:
            best = (p, m)
    return best[1]


def _enable_ansi():
    """在 Windows 10+ 控制台开启 ANSI 颜色（VT 模式）。其它系统默认支持。"""
    if os.name != 'nt':
        return True
    try:
        import ctypes
        k = ctypes.windll.kernel32
        h = k.GetStdHandle(-11)
        mode = ctypes.c_uint32()
        if not k.GetConsoleMode(h, ctypes.byref(mode)):
            return False
        return bool(k.SetConsoleMode(h, mode.value | 0x0004))
    except Exception:
        return False


def print_qr(url, quiet=4):
    """在终端打印二维码，强制“深色块 + 浅色底”，保证可扫。"""
    try:
        m = qr_matrix(url)
    except Exception:
        return
    n = len(m)
    if _enable_ansi():
        W = "\033[107m"  # 亮白背景
        B = "\033[40m"   # 黑色背景
        R = "\033[0m"
        blank = W + "  " * (n + 2 * quiet) + R
        lines = [blank] * quiet
        for r in range(n):
            s = W + "  " * quiet
            for c in range(n):
                s += (B if m[r][c] else W) + "  "
            s += W + "  " * quiet + R
            lines.append(s)
        lines += [blank] * quiet
        print("\n".join(lines))
    else:
        DARK = "██"
        LIGHT = "  "
        blank = LIGHT * (n + 2 * quiet)
        lines = [blank] * quiet
        for r in range(n):
            lines.append(LIGHT * quiet + "".join(DARK if m[r][c] else LIGHT for c in range(n)) + LIGHT * quiet)
        lines += [blank] * quiet
        print("\n".join(lines))


# =========================================================================
# 局域网共享服务器（自动刷新）
# =========================================================================
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
        if path == '/__livereload':
            return self.handle_sse()
        if path in ('/', '/' + INDEX):
            return self.serve_html(os.path.join(ROOT, INDEX))
        local = os.path.join(ROOT, path.lstrip('/'))
        if path.endswith('.html') and os.path.isfile(local):
            return self.serve_html(local)
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
    if ips:
        primary = "http://%s:%d" % (ips[0], PORT)
        print(" 手机扫码直接打开（需连同一个 WiFi）：%s" % primary)
        print()
        print_qr(primary)
        print()
    print(bar)
    print(" · 把上面的网址或二维码发给同事，连同一个 WiFi 即可打开")
    print(" · 你用新的 index.html 覆盖本目录后，对方页面会自动刷新")
    print(" · 停止共享：在本窗口按 Ctrl+C")
    print(bar)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止共享。")


if __name__ == "__main__":
    main()
