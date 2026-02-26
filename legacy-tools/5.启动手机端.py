#!/usr/bin/env python3
import argparse
import os
import subprocess
import sys
import time
from typing import List, Tuple
from scripts.start.utils import (
    LOGS_DIR,
    ROOT,
    spawn,
    write_pid,
    kill_pid_file,
    确保node_modules存在,
    检查端口是否被占用,
    检查运行环境,
    pkill_patterns,
    kill_port,
)

ROBOT_PHONE = ROOT / "app" / "robot-phone" / "RobotPhone"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="tools/5.启动手机端.py", add_help=False)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--start", "-s", action="store_true")
    group.add_argument("--stop", "-x", action="store_true")
    group.add_argument("--restart", "-r", action="store_true")
    group.add_argument("--android", "-a", action="store_true")
    group.add_argument("--ios", "-i", action="store_true")
    group.add_argument("--metro", "-m", action="store_true")
    group.add_argument("--help", "-h", action="store_true")
    return parser.parse_args()


def _default_action() -> str:
    if os.name == "nt":
        return "android"
    if sys.platform.startswith("linux"):
        return "android"
    return "ios"


def resolve_action(ns: argparse.Namespace) -> str:
    if ns.start:
        return "metro"
    if ns.stop:
        return "stop"
    if ns.restart:
        return "restart"
    if ns.android:
        return "android"
    if ns.ios:
        return "ios"
    if ns.metro:
        return "metro"
    if ns.help:
        return "help"
    return _default_action()


def show_help() -> None:
    print("机器狗控制系统 - 手机端启动脚本 (Python)")
    print("")
    print("用法：")
    print("  python3 tools/5.启动手机端.py [ACTION]")
    print("")
    print("操作参数 (ACTION):")
    print("  --android, -a     启动 Android（默认）")
    print("  --ios, -i         启动 iOS")
    print("  --metro, -m       仅启动 Metro")
    print("  --start, -s       启动 Metro")
    print("  --stop, -x        停止手机端相关进程")
    print("  --restart, -r     重启（默认平台）")
    print("  --help, -h        显示帮助")
    print("")


def start_metro() -> List[Tuple[str, int]]:
    确保node_modules存在(ROBOT_PHONE)
    print("🚀 启动手机端 Metro...")
    log_path = LOGS_DIR / "robot-phone" / "metro.log"
    _, pid = spawn(["npm", "run", "start"], cwd=ROBOT_PHONE, log_path=log_path)
    write_pid("robot-phone-metro", pid)
    return [("robot-phone-metro", pid)]


def start_android() -> List[Tuple[str, int]]:
    # 不手动启动start_metro，让run android自动启动它
    确保node_modules存在(ROBOT_PHONE)
    procs: List[Tuple[str, int]] = []
    print("🚀 启动手机端 Android...")
    log_path = LOGS_DIR / "robot-phone" / "android.log"
    device_id = _pick_android_device()
    if device_id:
        print(f"✅ 已检测到设备: {device_id}，跳过启动模拟器")
        cmd = ["npm", "run", "android", "--", "--deviceId", device_id]
    else:
        print("ℹ️  未检测到已连接设备，将尝试启动模拟器")
        cmd = ["npm", "run", "android"]
    _, pid = spawn(cmd, cwd=ROBOT_PHONE, log_path=log_path)
    write_pid("robot-phone-android", pid)
    procs.append(("robot-phone-android", pid))
    return procs


def start_ios() -> List[Tuple[str, int]]:
    procs = start_metro()
    print("🚀 启动手机端 iOS...")
    log_path = LOGS_DIR / "robot-phone" / "ios.log"
    _, pid = spawn(["npm", "run", "ios"], cwd=ROBOT_PHONE, log_path=log_path)
    write_pid("robot-phone-ios", pid)
    procs.append(("robot-phone-ios", pid))
    return procs


def stop_robot_phone() -> bool:
    any_stopped = False
    any_stopped |= kill_pid_file("robot-phone-android")
    any_stopped |= kill_pid_file("robot-phone-ios")
    any_stopped |= kill_pid_file("robot-phone-metro")
    pkill_patterns(["react-native", "metro"])
    if kill_port(8081):
        any_stopped = True
    return any_stopped


def _pick_android_device() -> str:
    try:
        out = subprocess.check_output(["adb", "devices"], text=True, stderr=subprocess.STDOUT)
    except Exception:
        return ""
    lines = out.strip().splitlines()
    if len(lines) <= 1:
        return ""
    for line in lines[1:]:
        if not line.strip():
            continue
        parts = line.split()
        if len(parts) >= 2 and parts[1] == "device":
            return parts[0]
    return ""


def monitor(pids: List[Tuple[str, int]]) -> int:
    print("")
    print("========================================")
    print("  ✅ 手机端启动完成，开始监控进程")
    print("========================================")
    print("按 Ctrl+C 停止所有服务")
    try:
        while True:
            time.sleep(1.0)
    except KeyboardInterrupt:
        print("\n正在停止服务...")
        return 130


def main() -> int:
    ns = parse_args()
    action = resolve_action(ns)

    if action == "help":
        show_help()
        return 0

    if action == "stop":
        stopped = stop_robot_phone()
        if stopped:
            print("✅ 已停止手机端相关进程")
        else:
            print("ℹ️  没有运行中的手机端进程")
        return 0

    检查运行环境()
    if not ROBOT_PHONE.exists():
        print(f"❌ 未找到手机端目录: {ROBOT_PHONE}")
        return 1

    if action == "restart":
        stop_robot_phone()
        time.sleep(2)
        action = _default_action()

    if action in {"metro", "ios", "android"}:
        if 检查端口是否被占用(8081):
            print("⚠️  端口 8081 被占用，尝试清理...")
            stop_robot_phone()
            time.sleep(1)
            if 检查端口是否被占用(8081):
                print("⚠️  端口 8081 仍被占用，强制清理...")
                kill_port(8081)

    if action == "metro":
        pids = start_metro()
    elif action == "ios":
        pids = start_ios()
    else:
        pids = start_android()

    rc = monitor(pids)
    try:
        stop_robot_phone()
    except KeyboardInterrupt:
        pass
    return rc


if __name__ == "__main__":
    sys.exit(main())
