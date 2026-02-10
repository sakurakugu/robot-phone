#!/usr/bin/env python3
"""
修复 Gradle 项目缺失的 Eclipse Buildship 配置文件

该脚本用于解决以下错误：
- Missing Gradle project configuration folder: .settings
- Missing Gradle project configuration file: .settings/org.eclipse.buildship.core.prefs

使用方法：
    python fix_gradle_settings.py                           # 自动扫描 node_modules 中的 Gradle 项目
    python fix_gradle_settings.py --path <目录路径>          # 指定目录
    python fix_gradle_settings.py --scan-all                # 扫描整个工作区
"""

import os
import sys
import argparse
from pathlib import Path

# Eclipse Buildship 配置文件内容
BUILDSHIP_PREFS_CONTENT = """connection.project.dir=
eclipse.preferences.version=1
"""


def 检测是否是gradle项目(directory: Path) -> bool:
    """判断目录是否是 Gradle 项目"""
    gradle_files = [
        'build.gradle',
        'build.gradle.kts',
        'settings.gradle',
        'settings.gradle.kts'
    ]
    return any((directory / gradle_file).exists() for gradle_file in gradle_files)


def 创建buildship配置文件(directory: Path, dry_run: bool = False) -> bool:
    """为指定目录创建 Buildship 配置文件"""
    settings_dir = directory / '.settings'
    prefs_file = settings_dir / 'org.eclipse.buildship.core.prefs'

    # 如果配置文件已存在，跳过
    if prefs_file.exists():
        return False

    if dry_run:
        print(f"[DRY RUN] 将创建: {prefs_file}")
        return True

    try:
        # 创建 .settings 目录
        settings_dir.mkdir(exist_ok=True)

        # 创建配置文件
        prefs_file.write_text(BUILDSHIP_PREFS_CONTENT, encoding='utf-8')

        print(f"✓ 已创建: {prefs_file}")
        return True
    except Exception as e:
        print(f"✗ 创建失败 {prefs_file}: {e}", file=sys.stderr)
        return False


def 扫描并修复gradle项目(root_path: Path, dry_run: bool = False) -> tuple[int, int]:
    """扫描并修复目录下的所有 Gradle 项目"""
    fixed_count = 0
    total_gradle_projects = 0

    print(f"正在扫描: {root_path}")
    print("-" * 60)

    # 遍历所有子目录
    for dirpath, dirnames, filenames in os.walk(root_path):
        current_dir = Path(dirpath)

        # 跳过已经有 .settings 的目录
        if '.settings' in dirnames:
            dirnames.remove('.settings')

        # 跳过某些不需要扫描的目录以提高性能
        skip_dirs = {'.git', '.gradle', '.kotlin', '__pycache__', 'build', 'dist'}
        dirnames[:] = [d for d in dirnames if d not in skip_dirs]

        # 检查是否是 Gradle 项目
        if 检测是否是gradle项目(current_dir):
            total_gradle_projects += 1
            if 创建buildship配置文件(current_dir, dry_run):
                fixed_count += 1

    return fixed_count, total_gradle_projects


def 修复react_native_gradle_plugin(workspace_root: Path, dry_run: bool = False) -> int:
    """专门修复 React Native Gradle Plugin 的配置问题"""
    fixed_count = 0

    # 常见的 React Native Gradle Plugin 路径
    plugin_paths = [
        'node_modules/@react-native/gradle-plugin',
        'app/robot-phone/RobotPhone/node_modules/@react-native/gradle-plugin',
    ]

    for plugin_path in plugin_paths:
        full_path = workspace_root / plugin_path
        if full_path.exists():
            print(f"\n检查 React Native Gradle Plugin: {full_path}")
            print("-" * 60)
            count, _ = 扫描并修复gradle项目(full_path, dry_run)
            fixed_count += count

    return fixed_count


def main():
    parser = argparse.ArgumentParser(
        description='修复 Gradle 项目缺失的 Eclipse Buildship 配置文件',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s                                    自动修复 React Native Gradle Plugin
  %(prog)s --path ./my-gradle-project        修复指定目录
  %(prog)s --scan-all                        扫描整个工作区
  %(prog)s --dry-run                         预览将要执行的操作
        """
    )

    parser.add_argument(
        '--path',
        type=str,
        help='要扫描的目录路径'
    )

    parser.add_argument(
        '--scan-all',
        action='store_true',
        help='扫描整个工作区的所有 Gradle 项目'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='预览模式，不实际创建文件'
    )

    parser.add_argument(
        '--workspace',
        type=str,
        help='工作区根目录（默认为脚本所在目录的上级目录）'
    )

    args = parser.parse_args()

    # 确定工作区根目录
    if args.workspace:
        workspace_root = Path(args.workspace).resolve()
    else:
        # 脚本在 tools/scripts/fix 目录下，工作区根目录是上级目录
        workspace_root = Path(__file__).parent.parent.parent.parent.resolve()

    if not workspace_root.exists():
        print(f"错误: 工作区目录不存在: {workspace_root}", file=sys.stderr)
        sys.exit(1)

    print(f"工作区根目录: {workspace_root}")
    print("=" * 60)

    if args.dry_run:
        print("⚠️  预览模式 - 不会实际创建文件")
        print("=" * 60)

    fixed_count = 0
    total_count = 0

    # 根据参数选择执行模式
    if args.path:
        # 修复指定目录
        target_path = Path(args.path).resolve()
        if not target_path.exists():
            print(f"错误: 目录不存在: {target_path}", file=sys.stderr)
            sys.exit(1)

        fixed_count, total_count = 扫描并修复gradle项目(target_path, args.dry_run)

    elif args.scan_all:
        # 扫描整个工作区
        fixed_count, total_count = 扫描并修复gradle项目(workspace_root, args.dry_run)

    else:
        # 默认：修复 React Native Gradle Plugin
        fixed_count = 修复react_native_gradle_plugin(workspace_root, args.dry_run)
        total_count = fixed_count  # 在这个模式下只统计修复的数量

    # 输出结果
    print("\n" + "=" * 60)
    if args.dry_run:
        print(f"预览完成: 发现 {fixed_count} 个项目需要修复")
    else:
        print(f"修复完成: 已为 {fixed_count} 个 Gradle 项目创建配置文件")

    if total_count > fixed_count:
        print(f"跳过 {total_count - fixed_count} 个已有配置的项目")

    print("\n💡 提示: 重新加载 VS Code 窗口以使更改生效")
    print("   快捷键: Ctrl+Shift+P -> 'Reload Window'")


if __name__ == '__main__':
    main()
