import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.request
from pathlib import Path
from typing import List, Tuple, Optional


def _配置标准流编码() -> None:
    """Windows 下统一使用 UTF-8 输出，避免表情符号触发编码异常"""
    if os.name != "nt":
        return

    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            try:
                reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass


_配置标准流编码()

from scripts.robot.package_builder import 执行打包流程
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
    持续监控直到中断,
)

ROBOT_PHONE = ROOT


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="tools/4.启动手机端.py", add_help=False)
    parser.add_argument("--start", "-s", action="store_true")
    parser.add_argument("--stop", "-x", action="store_true")
    parser.add_argument("--restart", "-r", action="store_true")
    parser.add_argument("--android", "-a", action="store_true")
    parser.add_argument("--ios", "-i", action="store_true")
    parser.add_argument("--metro", "-m", action="store_true")
    parser.add_argument("--build", "-b", action="store_true")
    parser.add_argument("--apk", "-ba", action="store_true")
    parser.add_argument("--debug", "-d", action="store_true")
    parser.add_argument("--release", "-rel", action="store_true")
    parser.add_argument("--update_version", "-u", nargs="?", const=True, help="更新版本号 (e.g. 1.2.3)")
    parser.add_argument("--help", "-h", action="store_true")
    return parser.parse_args()


def _default_action() -> str:
    if os.name == "nt":
        return "android"
    if sys.platform.startswith("linux"):
        return "android"
    return "ios"


def resolve_action(ns: argparse.Namespace) -> Tuple[str, str]:
    """返回 (action, build_type) 元组
    action: 操作的类型
    build_type: "debug" 或 "release" 或 "unknown"
    """
    # 首先确定构建类型
    if ns.debug and ns.release:
        build_type = "release"  # --debug --release 优先使用 release
    elif ns.debug:
        build_type = "debug"
    elif ns.release:
        build_type = "release"
    else:
        build_type = "unknown"  # 默认使用 release

    # 然后确定操作类型
    if ns.start:
        return ("metro", build_type)
    if ns.stop:
        return ("stop", build_type)
    if ns.restart:
        return ("restart", build_type)
    if ns.android:
        return ("android", build_type)
    if ns.ios:
        return ("ios", build_type)
    if ns.metro:
        return ("metro", build_type)
    if ns.apk or ns.build:
        return ("build_apk", build_type)
    if ns.update_version:
        return ("update_version", build_type)
    if ns.help:
        return ("help", build_type)
    return (_default_action(), build_type)


def show_help() -> None:
    print("机器狗控制系统 - 手机端启动脚本 (Python)")
    print("")
    print("用法：")
    print("  python3 tools/4.启动手机端.py [ACTION]")
    print("")
    print("操作参数 (ACTION):")
    print("  --android, -a     启动 Android（默认）")
    print("  --ios, -i         启动 iOS")
    print("  --metro, -m       仅启动 Metro")
    print("  --start, -s       启动 Metro")
    print("  --build, -b       构建 Android Release APK")
    print("  --apk, -ba        构建 Android Release APK")
    print("  --update_version, -u [VER] 更新版本号 (交互式或指定版本)")
    print("  --stop, -x        停止手机端相关进程")
    print("  --restart, -r     重启（默认平台）")
    print("  --help, -h        显示帮助")
    print("")


def _get_project_name(android_dir: Path) -> str:
    """从 settings.gradle 获取 rootProject.name"""
    settings_gradle = android_dir / "settings.gradle"
    if settings_gradle.exists():
        try:
            content = settings_gradle.read_text(encoding="utf-8")
            match = re.search(r"rootProject\.name\s*=\s*['\"]([^'\"]+)['\"]", content)
            if match:
                return match.group(1)
        except Exception:
            pass
    return "RobotPhone"


def _parse_version(version_str: str) -> Tuple[str, int]:
    """
    解析版本号字符串，返回 (标准化版本号, 版本代码)
    Example: "1.2.3" -> ("1.2.3", 1002003)
    Logic: Major * 1,000,000 + Minor * 1,000 + Patch
    """
    parts = version_str.strip().split(".")
    if len(parts) > 3:
        raise ValueError(f"版本号格式错误 (最多3位): {version_str}")

    # 补全 x.y.z
    while len(parts) < 3:
        parts.append("0")

    try:
        major = int(parts[0])
        minor = int(parts[1])
        patch = int(parts[2])
    except ValueError:
         raise ValueError(f"版本号包含非数字字符: {version_str}")

    if minor >= 1000 or patch >= 1000:
        raise ValueError("Minor 和 Patch 版本号不能超过 999")

    version_code = major * 1000000 + minor * 1000 + patch
    normalized_version = f"{major}.{minor}.{patch}"
    return normalized_version, version_code


def _get_android_current_version() -> Tuple[Optional[str], Optional[int]]:
    """读取 Android 当前版本信息"""
    gradle_file = ROBOT_PHONE / "android" / "app" / "build.gradle"
    if not gradle_file.exists():
        return None, None

    content = gradle_file.read_text(encoding="utf-8")
    name_match = re.search(r'versionName\s+"([^"]+)"', content)
    code_match = re.search(r'versionCode\s+(\d+)', content)

    v_name = name_match.group(1) if name_match else None
    v_code = int(code_match.group(1)) if code_match else None
    return v_name, v_code


def _update_android_version(version_str: str, version_code: int) -> bool:
    print("🤖 更新 Android 版本...")
    gradle_file = ROBOT_PHONE / "android" / "app" / "build.gradle"
    if not gradle_file.exists():
        print(f"❌ 未找到 {gradle_file}")
        return False

    content = gradle_file.read_text(encoding="utf-8")

    # 替换 versionName
    new_content = re.sub(r'versionName\s+"[^"]+"', f'versionName "{version_str}"', content)
    # 替换 versionCode
    new_content = re.sub(r'versionCode\s+\d+', f'versionCode {version_code}', new_content)

    if content == new_content:
        print("   版本号未发生变化")
        return False

    gradle_file.write_text(new_content, encoding="utf-8")
    print(f"\t✅ Android 版本已更新: {version_str} ({version_code})")
    return True


def _update_ios_version(version_str: str, version_code: int) -> bool:
    print("🍎 更新 iOS 版本...")
    project_file = ROBOT_PHONE / "ios" / "RobotPhone.xcodeproj" / "project.pbxproj"
    if not project_file.exists():
        print(f"❌ 未找到 {project_file}")
        return False

    content = project_file.read_text(encoding="utf-8")

    # 替换 MARKETING_VERSION (versionName)
    new_content = re.sub(r'(MARKETING_VERSION\s*=\s*)[^;]+;', f'\\g<1>{version_str};', content)
    # 替换 CURRENT_PROJECT_VERSION (versionCode)
    new_content = re.sub(r'(CURRENT_PROJECT_VERSION\s*=\s*)[^;]+;', f'\\g<1>{version_code};', new_content)

    if content == new_content:
        print("   版本号未发生变化")
        return False

    project_file.write_text(new_content, encoding="utf-8")
    print(f"\t✅ iOS 版本已更新: {version_str} ({version_code})")
    return True


def update_version(ns: argparse.Namespace) -> int:
    # 1. 确定目标平台
    target_android = ns.android
    target_ios = ns.ios

    # 如果都未指定，默认两个都更新
    if not target_android and not target_ios:
        target_android = True
        target_ios = True

    # 2. 获取当前版本 (优先从 Android 获取，作为基准)
    current_ver_str, current_ver_code = _get_android_current_version()
    if not current_ver_str:
        current_ver_str = "0.0.0"
        current_ver_code = 0

    print(f"ℹ️  当前版本 (Android): {current_ver_str} (Code: {current_ver_code})")

    # 3. 确定新版本
    new_ver_input = ns.update_version
    if new_ver_input is True: # Flag provided but no value
        try:
            new_ver_input = input(f"请输入新版本号 (当前: {current_ver_str}): ").strip()
        except KeyboardInterrupt:
            print("\n取消更新")
            return 1

    if not new_ver_input:
        print("❌ 未提供版本号")
        return 1

    try:
        new_ver_str, new_ver_code = _parse_version(new_ver_input)
    except ValueError as e:
        print(f"❌ 版本号格式错误: {e}")
        return 1

    print(f"准备更新: {current_ver_str} -> {new_ver_str} (Code: {new_ver_code})")

    # 4. 安全检查
    if current_ver_code and new_ver_code < current_ver_code:
        print(f"⚠️  警告: 新版本号 ({new_ver_code}) 小于当前版本号 ({current_ver_code})")
        confirm = input("确认要降级吗？[y/N] ").lower()
        if confirm != 'y':
            print("已取消")
            return 0

    if current_ver_code and (new_ver_code - current_ver_code > 100000): # 跨度过大 (Major change)
         print(f"⚠️  警告: 版本号跨度较大 ({current_ver_str} -> {new_ver_str})")
         confirm = input("确认更新吗？[y/N] ").lower()
         if confirm != 'y':
            print("已取消")
            return 0

    # 5. 执行更新
    success = True
    if target_android:
        if not _update_android_version(new_ver_str, new_ver_code):
            success = False

    if target_ios:
        if not _update_ios_version(new_ver_str, new_ver_code):
            success = False

    if success:
        print(f"✨ 版本更新完成！ {current_ver_str} -> {new_ver_str}")
        return 0
    else:
        print("⚠️  部分更新失败或未发生变化")
        return 1


def _get_custom_build_dir(android_dir: Path) -> Optional[Path]:
    """尝试从 app/build.gradle 解析 buildDir"""
    app_build_gradle = android_dir / "app" / "build.gradle"
    if not app_build_gradle.exists():
        return None
    try:
        content = app_build_gradle.read_text(encoding="utf-8")
        # 匹配 buildDir = "..."
        match = re.search(r'buildDir\s*=\s*["\']([^"\']+)["\']', content)
        if match:
            raw_path = match.group(1)
            root_name = _get_project_name(android_dir)
            # 简单的变量替换
            raw_path = raw_path.replace("${rootProject.name}", root_name).replace("$rootProject.name", root_name)
            # project.name 在 app 模块中通常是 'app'
            raw_path = raw_path.replace("${project.name}", "app").replace("$project.name", "app")
            return Path(raw_path)
    except Exception:
        pass
    return None


def _打开目录(target_dir: Path) -> None:
    if os.name == "nt":
        os.startfile(target_dir)
    elif sys.platform == "darwin":
        subprocess.run(["open", str(target_dir)])
    else:
        subprocess.run(["xdg-open", str(target_dir)])


def _规范化绝对路径(target: Path) -> str:
    """返回用于比较的规范化绝对路径字符串"""
    return os.path.normcase(str(target.resolve(strict=False)))


def _安全删除目录(target_dir: Path) -> None:
    """仅允许删除工作区内的目录，避免误删"""
    if not target_dir.exists():
        return

    root_str = _规范化绝对路径(ROOT)
    target_str = _规范化绝对路径(target_dir)
    if os.path.commonpath([root_str, target_str]) != root_str:
        raise ValueError(f"拒绝删除工作区外目录: {target_dir}")

    shutil.rmtree(target_dir)


def _停止gradle守护进程(android_dir: Path) -> None:
    """尽量停止 Gradle 守护进程，避免 Windows 下文件锁导致清理失败"""
    gradlew = android_dir / ("gradlew.bat" if os.name == "nt" else "gradlew")
    if not gradlew.exists():
        return

    try:
        subprocess.run(
            [str(gradlew), "--stop"],
            cwd=android_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    except Exception:
        pass


def _预清理陈旧android缓存(android_dir: Path) -> None:
    """检测并清理目录迁移后遗留的 React Native 自动链接缓存"""
    autolinking_dir = android_dir / "build" / "generated" / "autolinking"
    autolinking_file = autolinking_dir / "autolinking.json"
    if not autolinking_file.exists():
        return

    try:
        cached_config = json.loads(autolinking_file.read_text(encoding="utf-8"))
    except Exception:
        return

    cached_root = cached_config.get("root")
    if not cached_root:
        return

    expected_root = _规范化绝对路径(ROBOT_PHONE)
    actual_root = _规范化绝对路径(Path(cached_root))
    if actual_root == expected_root:
        return

    print("⚠️  检测到 React Native 自动链接缓存仍指向旧目录，正在自动清理...")
    print(f"   当前项目目录: {ROBOT_PHONE}")
    print(f"   缓存记录目录: {cached_root}")

    _停止gradle守护进程(android_dir)
    _安全删除目录(autolinking_dir)

    # Windows 下原生模块目录偶发被旧构建过程锁住，一并清掉可避免二次失败。
    screens_build_dir = ROBOT_PHONE / "node_modules" / "react-native-screens" / "android" / "build"
    _安全删除目录(screens_build_dir)

    print("✅  旧缓存已清理，本次构建将重新生成自动链接配置")


def _构建并处理apk(variant: str, gradle_task: str) -> int:
    android_dir = ROBOT_PHONE / "android"
    gradlew = android_dir / ("gradlew.bat" if os.name == "nt" else "gradlew")
    if not gradlew.exists():
        print(f"❌ 未找到 gradlew: {gradlew}")
        return 1
    _预清理陈旧android缓存(android_dir)
    print(f"🔨 开始构建 Android {variant.capitalize()} APK...")
    result = subprocess.run(
        [str(gradlew), gradle_task],
        cwd=android_dir,
    )
    if result.returncode != 0:
        print("❌ 构建失败")
        return result.returncode

    apk_dir_default = android_dir / "app" / "build" / "outputs" / "apk" / variant
    apk_dir_custom = None
    custom_build_root = _get_custom_build_dir(android_dir)
    if custom_build_root:
        apk_dir_custom = custom_build_root / "outputs" / "apk" / variant

    apk_dir = None
    if apk_dir_default.exists():
        apk_dir = apk_dir_default
    elif apk_dir_custom and apk_dir_custom.exists():
        apk_dir = apk_dir_custom

    if apk_dir and apk_dir.exists():
        apks = list(apk_dir.glob("*.apk"))
        if apks:
            size_mb = round(apks[0].stat().st_size / 1024 / 1024, 2)
            print(f"✅ 构建成功！APK 路径：{apks[0]}  [{size_mb} MB]")
            print(f"📂 正在打开输出目录：{apk_dir}")
            _打开目录(apk_dir)
        else:
            print(f"✅ 构建成功！但在 {apk_dir} 未找到 APK 文件。")
    else:
        print(f"✅ 构建成功！(未找到 APK 输出目录，检查过: {apk_dir_default} 和 {apk_dir_custom})")
    return 0


def build_apk_debug() -> int:
    return _构建并处理apk("debug", "assembleDebug")


def build_apk_release() -> int:
    return _构建并处理apk("release", "assembleRelease")


def _修复hermes_win64() -> None:
    """Windows 专用：检查并自动补全缺失的 hermesc.exe 及 ICU DLL。

    hermes-compiler 某些版本（如 250829098.0.x）发布时未包含 win64-bin 目录，
    导致 Gradle 构建报错 "Couldn't determine Hermesc location"。
    此函数从 npm 下载包含 Windows 二进制的版本并补全缺失文件。
    """
    if os.name != "nt":
        return

    hermes_compiler_dir = ROBOT_PHONE / "node_modules" / "hermes-compiler"
    if not hermes_compiler_dir.exists():
        return  # node_modules 尚未安装，跳过

    win64_dir = hermes_compiler_dir / "hermesc" / "win64-bin"
    hermesc_exe = win64_dir / "hermesc.exe"
    if hermesc_exe.exists():
        return  # 已存在，无需修复

    print("⚠️  未找到 hermesc.exe（Windows），正在自动下载修复...")
    # 250829098.0.9 是包含 win64-bin 的最新同系列版本
    npm_url = "https://registry.npmjs.org/hermes-compiler/-/hermes-compiler-250829098.0.9.tgz"
    try:
        with tempfile.TemporaryDirectory() as tmp:
            tgz_path = os.path.join(tmp, "hermes-compiler.tgz")
            print(f"   下载中：{npm_url}")
            urllib.request.urlretrieve(npm_url, tgz_path)
            with tarfile.open(tgz_path, "r:gz") as tar:
                members = [
                    m for m in tar.getmembers()
                    if m.name.startswith("package/hermesc/win64-bin/")
                ]
                if not members:
                    print("❌  下载的包中未找到 win64-bin 目录，请手动处理")
                    return
                win64_dir.mkdir(parents=True, exist_ok=True)
                for m in members:
                    fname = Path(m.name).name
                    if not fname:
                        continue
                    f = tar.extractfile(m)
                    if f is None:
                        continue
                    dest = win64_dir / fname
                    dest.write_bytes(f.read())
        print(f"✅  hermesc.exe 已修复：{hermesc_exe}")
    except Exception as e:
        print(f"❌  自动修复 hermesc.exe 失败：{e}")
        print("   请手动将 hermesc.exe 放至：")
        print(f"   {win64_dir}")


def _执行机器人套件打包() -> tuple[str, str, list[Path]]:
    return 执行打包流程(open_explorer=False, require_prompt=False)


def _清空目录(target_dir: Path) -> None:
    if not target_dir.exists():
        return
    for item in target_dir.iterdir():
        if item.is_dir():
            shutil.rmtree(item)
        else:
            item.unlink()


def _拷贝机器人套件到目录(outputs: List[Path], target_dir: Path) -> None:
    target_dir.mkdir(parents=True, exist_ok=True)
    _清空目录(target_dir)
    for output in outputs:
        shutil.copy2(output, target_dir / output.name)


def _准备并放置机器人套件() -> bool:
    try:
        _, _, outputs = _执行机器人套件打包()
    except Exception as e:
        print(f"❌ 机器人套件打包失败：{e}")
        return False

    if not outputs:
        print("❌ 未生成任何机器人套件，停止构建")
        return False

    android_assets = ROBOT_PHONE / "android" / "app" / "src" / "main" / "assets" / "robot-packages"
    _拷贝机器人套件到目录(outputs, android_assets)

    ios_resources = ROBOT_PHONE / "ios" / "RobotPhone" / "robot-packages"
    if ios_resources.parent.exists():
        _拷贝机器人套件到目录(outputs, ios_resources)
    return True


def build_apk(build_type: str) -> int:
    """
    根据构建类型调用具体的构建函数
    :param build_type: "debug", "release", 或 "unknown"
    """
    if not _准备并放置机器人套件():
        return 1
    _修复hermes_win64()
    if build_type == "debug":
        return build_apk_debug()
    elif build_type == "release":
        return build_apk_release()
    else:
        # 如果未指定 --debug 或 --release，默认构建 Release 版本
        print("ℹ️  未指定构建类型，默认构建 Release 版本...")
        return build_apk_release()


def start_metro() -> List[Tuple[str, int]]:
    确保node_modules存在(ROBOT_PHONE, legacy_peer_deps=True)
    print("🚀 启动手机端 Metro...")
    log_path = LOGS_DIR / "phone-app" / "metro.log"
    _, pid = spawn(["npm", "run", "start"], cwd=ROBOT_PHONE, log_path=log_path)
    write_pid("phone-app-metro", pid)
    return [("phone-app-metro", pid)]


def start_android() -> List[Tuple[str, int]]:
    # 不手动启动 start_metro，让 run android 自动启动它
    确保node_modules存在(ROBOT_PHONE, legacy_peer_deps=True)
    procs: List[Tuple[str, int]] = []
    print("🚀 启动手机端 Android...")
    log_path = LOGS_DIR / "phone-app" / "android.log"
    device_id = _pick_android_device()
    if device_id:
        print(f"✅ 已检测到设备：{device_id}，跳过启动模拟器")
        cmd = ["npm", "run", "android", "--", "--device", device_id]
    else:
        print("ℹ️  未检测到已连接设备，将尝试启动模拟器")
        cmd = ["npm", "run", "android"]
    _, pid = spawn(cmd, cwd=ROBOT_PHONE, log_path=log_path)
    write_pid("phone-app-android", pid)
    procs.append(("phone-app-android", pid))
    return procs


def start_ios() -> List[Tuple[str, int]]:
    procs = start_metro()
    print("🚀 启动手机端 iOS...")
    log_path = LOGS_DIR / "phone-app" / "ios.log"
    _, pid = spawn(["npm", "run", "ios"], cwd=ROBOT_PHONE, log_path=log_path)
    write_pid("phone-app-ios", pid)
    procs.append(("phone-app-ios", pid))
    return procs


def stop_robot_phone() -> bool:
    any_stopped = False
    any_stopped |= kill_pid_file("phone-app-android")
    any_stopped |= kill_pid_file("phone-app-ios")
    any_stopped |= kill_pid_file("phone-app-metro")
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


def main() -> int:
    print("\033]0;手机端\007")
    ns = parse_args()
    action, build_type = resolve_action(ns)

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
        print(f"❌ 未找到手机端目录：{ROBOT_PHONE}")
        return 1

    if action == "restart":
        stop_robot_phone()
        time.sleep(2)
        action = _default_action()
        # restart 不涉及构建类型变化，保持原 build_type 或重置均可，此处保持

    # 端口检查仅针对启动服务的情况
    if action in {"metro", "ios", "android"}:
        if not _准备并放置机器人套件():
            print("❌ 机器人套件准备失败")
            return 1
        if 检查端口是否被占用(8081):
            print("⚠️  端口 8081 被占用，尝试清理...")
            stop_robot_phone()
            time.sleep(1)
            if 检查端口是否被占用(8081):
                print("⚠️  端口 8081 仍被占用，强制清理...")
                kill_port(8081)

    if action == "build_apk":
        return build_apk(build_type)

    if action == "update_version":
        return update_version(ns)

    # 启动服务逻辑
    if action == "metro":
        start_metro()
    elif action == "ios":
        start_ios()
    else:
        # 默认 android 或 restart 后的默认动作
        start_android()

    rc = 持续监控直到中断("手机端启动完成，开始监控进程")
    try:
        stop_robot_phone()
    except KeyboardInterrupt:
        pass
    return rc


if __name__ == "__main__":
    sys.exit(main())
