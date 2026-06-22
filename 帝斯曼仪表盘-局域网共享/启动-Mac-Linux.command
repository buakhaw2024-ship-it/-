#!/bin/bash
# 双击运行（macOS）或在终端执行：bash 启动-Mac-Linux.command
cd "$(dirname "$0")"
if command -v python3 >/dev/null 2>&1; then
  python3 serve.py
else
  echo "未检测到 python3，请先安装 Python 3：https://www.python.org/downloads/"
  read -p "按回车键退出..." _
fi
