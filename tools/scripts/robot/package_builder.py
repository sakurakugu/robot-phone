"""robot-agent 套件打包工具"""

import fnmatch
import json
import os
import tarfile
import tempfile
import zipfile
from pathlib import Path
from typing import Literal

PROJECT_ROOT = Path(__file__).resolve().parents[3]
PACKAGES_DIR = PROJECT_ROOT / ".cache" / "robot-packages"

本体项目清单 = [
    {
        "id": "sparkrobot-common",
        "title": "SparkRobot Common",
        "archive_name": "sparkrobot-common.tar.gz",
        "install_mode": "python-editable",
        "remote_dir_name": "sparkrobot-common",
    },
    {
        "id": "robot-server",
        "title": "Robot Server",
        "archive_name": "robot-server.tar.gz",
        "install_mode": "python-service",
        "remote_dir_name": "robot-server",
    },
    {
        "id": "robot-agent",
        "title": "Robot Agent",
        "archive_name": "robot-agent.tar.gz",
        "install_mode": "python-service",
        "remote_dir_name": "robot-agent",
    },
    {
        "id": "robot-ros",
        "title": "Robot ROS",
        "archive_name": "robot-ros.tar.gz",
        "install_mode": "ros-workspace",
        "remote_dir_name": "robot-ros",
    },
    {
        "id": "robot-runtime",
        "title": "Robot Runtime",
        "archive_name": "robot-runtime.tar.gz",
        "install_mode": "python-service",
        "remote_dir_name": "robot-runtime",
    },
]

忽略模式 = [
    "__pycache__", "*.pyc", "*.pyo", "*.pyd",
    "*.egg-info", ".git", ".idea", ".vscode",
    ".DS_Store", "node_modules", "dist", "build", "install", "log",
    ".mypy_cache", ".ruff_cache",
]


def 解析压缩格式(raw_value: str) -> tuple[str, str]:
    """解析压缩格式，返回 (打包格式, 文件扩展名)"""
    value = raw_value.strip().lower()
    if value.startswith("."):
        value = value.lstrip(".")

    format_mapping = {
        "tar.gz": ("gztar", ".tar.gz"),
        "tgz": ("gztar", ".tar.gz"),
        "gztar": ("gztar", ".tar.gz"),
        "zip": ("zip", ".zip"),
        "tar": ("tar", ".tar"),
        "bztar": ("bztar", ".tar.bz2"),
        "tar.bz2": ("bztar", ".tar.bz2"),
        "xztar": ("xztar", ".tar.xz"),
        "tar.xz": ("xztar", ".tar.xz"),
    }

    if not value:
        return "gztar", ".tar.gz"

    if value in format_mapping:
        return format_mapping[value]

    print("[ERR] 未识别的压缩格式，已使用默认 tar.gz")
    return "gztar", ".tar.gz"


def 是否忽略路径(target: Path) -> bool:
    """判断路径是否应在打包时跳过"""
    for part in target.parts:
        for pattern in 忽略模式:
            if fnmatch.fnmatch(part, pattern):
                return True
    return False


def 写入压缩包(output_path: Path, source_dir: Path, archive_format: str) -> None:
    """将目录写入目标压缩包"""
    if output_path.exists():
        output_path.unlink()

    if archive_format == "zip":
        with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as zip_file:
            for root, dirs, files in os.walk(source_dir):
                root_path = Path(root)
                dirs[:] = [d for d in dirs if not 是否忽略路径(root_path / d)]
                for file_name in files:
                    file_path = root_path / file_name
                    if 是否忽略路径(file_path):
                        continue
                    arcname = file_path.relative_to(source_dir).as_posix()
                    zip_file.write(file_path, arcname)
        return

    mode_mapping: dict[str, Literal["w", "w:gz", "w:bz2", "w:xz"]] = {
        "gztar": "w:gz",
        "tar": "w",
        "bztar": "w:bz2",
        "xztar": "w:xz",
    }
    mode = mode_mapping.get(archive_format)
    if mode is None:
        raise ValueError(f"不支持的压缩格式: {archive_format}")

    with tarfile.open(output_path, mode) as tar_file:
        for root, dirs, files in os.walk(source_dir):
            root_path = Path(root)
            dirs[:] = [d for d in dirs if not 是否忽略路径(root_path / d)]
            for file_name in files:
                file_path = root_path / file_name
                if 是否忽略路径(file_path):
                    continue
                arcname = file_path.relative_to(source_dir).as_posix()
                tar_file.add(file_path, arcname=arcname)


def 获取打包输出目录() -> Path:
    """返回打包产物目录"""
    return PACKAGES_DIR


def 获取robot_onboard根目录() -> Path:
    """自动定位 robot-onboard 仓库目录"""
    候选目录 = [
        PROJECT_ROOT.parent / "robot-onboard",
        PROJECT_ROOT.parent / "robot-workspace" / "repos" / "robot-onboard",
        PROJECT_ROOT / "repos" / "robot-onboard",
    ]

    for candidate in 候选目录:
        if (candidate / "robot-agent").exists() and (candidate / "robot-server").exists() and (candidate / "sparkrobot-common").exists():
            return candidate

    raise FileNotFoundError(
        "未找到 robot-onboard 仓库，请将 robot-onboard 放在当前仓库同级目录，"
        "或在 robot-workspace 中通过 repos/robot-onboard 提供。"
    )


def 打包单个项目(name: str, source_dir: Path, package_ext: str | None = None) -> Path | None:
    """按指定扩展名打包单个项目"""
    if not source_dir.exists():
        print(f"[ERR] 找不到目录: {source_dir}")
        return None

    archive_format, ext = 解析压缩格式(package_ext or "tar.gz")
    PACKAGES_DIR.mkdir(parents=True, exist_ok=True)
    output_path = PACKAGES_DIR / f"{name}{ext}"
    写入压缩包(output_path, source_dir, archive_format)
    print(f"✓ 已生成: {output_path}")
    return output_path


def 获取本体项目列表() -> list[tuple[str, Path]]:
    """返回手机端首次安装所需的本体项目目录。"""
    robot_onboard_root = 获取robot_onboard根目录()
    return [
        (item["id"], robot_onboard_root / item["id"]) for item in 本体项目清单
    ]


def 构建整包清单(project_names: list[str], bundle_ext: str) -> dict:
    """根据项目名生成整包 manifest。"""
    item_by_id = {item["id"]: item for item in 本体项目清单}
    selected_items = [item_by_id[name] for name in project_names if name in item_by_id]
    return {
        "bundle": "robot-full",
        "install_order": [item["id"] for item in selected_items],
        "items": selected_items,
        "package_archive_ext": ".tar.gz",
        "bundle_archive_ext": bundle_ext,
    }


def 打包robot_agent套件(archive_format: str, ext: str) -> list[Path]:
    """打包手机端首次安装所需的 full 整包。"""
    PACKAGES_DIR.mkdir(parents=True, exist_ok=True)
    output_path = PACKAGES_DIR / f"robot-full{ext}"

    with tempfile.TemporaryDirectory(prefix="robot-phone-full-") as temp_dir_raw:
        temp_dir = Path(temp_dir_raw)
        packages_dir = temp_dir / "packages"
        packages_dir.mkdir(parents=True, exist_ok=True)

        bundled_names: list[str] = []
        for name, path in 获取本体项目列表():
            if not path.exists():
                print(f"[ERR] 找不到目录: {path}")
                continue
            child_output = packages_dir / f"{name}.tar.gz"
            写入压缩包(child_output, path, "gztar")
            bundled_names.append(name)

        if not bundled_names:
            return []

        manifest = 构建整包清单(bundled_names, ext)
        (temp_dir / "manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        写入压缩包(output_path, temp_dir, archive_format)

    print(f"[OK] 已生成: {output_path}")
    return [output_path]


def 执行打包流程(open_explorer: bool = True, require_prompt: bool = True) -> tuple[str, str, list[Path]]:
    """执行 robot-onboard 本体整包打包流程"""
    print("\n" + "-" * 50)
    print("打包 robot-onboard 本体整包")
    print("-" * 50)

    if require_prompt:
        print("支持格式: tar.gz(默认), zip, tar, tar.bz2, tar.xz")
        raw_format = input("请输入压缩格式 (回车默认 tar.gz): ")
        archive_format, ext = 解析压缩格式(raw_format)
    else:
        archive_format, ext = 解析压缩格式("tar.gz")

    outputs = 打包robot_agent套件(archive_format, ext)
    if outputs:
        print("\n" + "=" * 50)
        print("[OK] 打包完成")
        print("=" * 50)
        if open_explorer and hasattr(os, "startfile"):
            os.startfile(str(PACKAGES_DIR))
    else:
        print("\n" + "=" * 50)
        print("[ERR] 打包失败")
        print("=" * 50)
    return archive_format, ext, outputs
