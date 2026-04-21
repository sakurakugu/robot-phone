export type PackageType = 'common' | 'server' | 'agent' | 'ros' | 'runtime';
export type PackageInstallMode = 'python-editable' | 'python-service' | 'ros-workspace';

export type PackageInstallSpec = {
  key: PackageType;
  name: string;
  title: string;
  archiveName: string;
  installMode: PackageInstallMode;
  remoteDirName: string;
};

export type FullPackageManifestItem = {
  id: string;
  title: string;
  archive_name: string;
  install_mode: PackageInstallMode;
  remote_dir_name: string;
};

export type FullPackageManifest = {
  bundle: 'robot-full';
  install_order?: string[];
  items: FullPackageManifestItem[];
  package_archive_ext?: string;
  bundle_archive_ext?: string;
};

const ROSDISTRO_INDEX_URL = 'https://mirrors.tuna.tsinghua.edu.cn/rosdistro/index-v4.yaml';
const ROSDEP_SOURCES_LIST_CONTENT = `# os-specific listings first
yaml https://mirrors.tuna.tsinghua.edu.cn/rosdistro/rosdep/osx-homebrew.yaml osx

# generic
yaml https://mirrors.tuna.tsinghua.edu.cn/rosdistro/rosdep/base.yaml
yaml https://mirrors.tuna.tsinghua.edu.cn/rosdistro/rosdep/python.yaml
yaml https://mirrors.tuna.tsinghua.edu.cn/rosdistro/rosdep/ruby.yaml
`;

export const PACKAGE_INSTALL_ORDER: PackageType[] = ['common', 'server', 'agent', 'ros', 'runtime'];

export const PACKAGE_INSTALL_SPECS: Record<PackageType, PackageInstallSpec> = {
  common: {
    key: 'common',
    name: 'sparkrobot-common',
    title: 'SparkRobot Common',
    archiveName: 'sparkrobot-common.tar.gz',
    installMode: 'python-editable',
    remoteDirName: 'sparkrobot-common',
  },
  server: {
    key: 'server',
    name: 'robot-server',
    title: 'Robot Server',
    archiveName: 'robot-server.tar.gz',
    installMode: 'python-service',
    remoteDirName: 'robot-server',
  },
  agent: {
    key: 'agent',
    name: 'robot-agent',
    title: 'Robot Agent',
    archiveName: 'robot-agent.tar.gz',
    installMode: 'python-service',
    remoteDirName: 'robot-agent',
  },
  ros: {
    key: 'ros',
    name: 'robot-ros',
    title: 'Robot ROS',
    archiveName: 'robot-ros.tar.gz',
    installMode: 'ros-workspace',
    remoteDirName: 'robot-ros',
  },
  runtime: {
    key: 'runtime',
    name: 'robot-runtime',
    title: 'Robot Runtime',
    archiveName: 'robot-runtime.tar.gz',
    installMode: 'python-service',
    remoteDirName: 'robot-runtime',
  },
};

export type RunRemoteCommand = (
  title: string,
  command: string,
  timeoutSeconds?: number,
) => Promise<string>;

export type UploadRemoteFile = (
  remotePath: string,
  base64: string,
  label: string,
) => Promise<void>;

export type InstallFullPackageFromBase64Args = {
  user: string;
  archiveBase64: string;
  archiveFileName: string;
  runRemoteCommand: RunRemoteCommand;
  uploadRemoteFile: UploadRemoteFile;
  onProgress?: (text: string) => void;
};

function 构建默认清单项(type: PackageType): FullPackageManifestItem {
  const spec = PACKAGE_INSTALL_SPECS[type];
  return {
    id: spec.name,
    title: spec.title,
    archive_name: spec.archiveName,
    install_mode: spec.installMode,
    remote_dir_name: spec.remoteDirName,
  };
}

async function 安装远程压缩包(args: {
  item: FullPackageManifestItem;
  user: string;
  remoteArchive: string;
  runRemoteCommand: RunRemoteCommand;
  onProgress?: (text: string) => void;
}) {
  const { item, user, remoteArchive, runRemoteCommand, onProgress } = args;
  const remoteDir = `/home/${user}/sparkrobot/${item.remote_dir_name}`;
  const isGzip = remoteArchive.endsWith('.tar.gz');

  onProgress?.(`安装 ${item.title}`);
  await runRemoteCommand(`创建目录 (${item.title})`, `mkdir -p ${remoteDir}`);
  await runRemoteCommand(
    `修正权限 (${item.title})`,
    `sudo chown -R ${user}:${user} ${remoteDir}`,
  );
  if (item.install_mode === 'ros-workspace') {
    await runRemoteCommand(
      `清理旧构建目录 (${item.title})`,
      `rm -rf ${remoteDir}/build ${remoteDir}/install ${remoteDir}/log`,
    );
  }
  await runRemoteCommand(
    `解压安装包 (${item.title})`,
    `tar ${isGzip ? '-xzf' : '-xf'} ${remoteArchive} -C ${remoteDir}`,
    item.install_mode === 'ros-workspace' ? 300 : 180,
  );

  if (item.install_mode === 'python-editable') {
    await runRemoteCommand(
      `安装依赖 (${item.title})`,
      'python3 -m pip install --upgrade pip setuptools wheel uuid6 watchdog',
      180,
    );
    await runRemoteCommand(
      `安装包 (${item.title})`,
      `python3 -m pip install -e ${remoteDir}`,
      180,
    );
    return;
  }

  if (item.install_mode === 'ros-workspace') {
    const rosdepSources = ROSDEP_SOURCES_LIST_CONTENT.replace(/'/g, `'"'"'`);
    await runRemoteCommand(
      `检查 ROS2 环境 (${item.title})`,
      "bash -lc 'test -f /opt/ros/humble/setup.bash'",
    );
    await runRemoteCommand(
      `初始化 rosdep (${item.title})`,
      "sudo bash -lc 'if [ ! -f /etc/ros/rosdep/sources.list.d/20-default.list ]; then rosdep init; fi'",
      180,
    );
    await runRemoteCommand(
      `切换 rosdep 镜像源 (${item.title})`,
      `sudo bash -lc 'cat > /etc/ros/rosdep/sources.list.d/20-default.list <<'"'"'EOF'"'"'\n${rosdepSources}\nEOF'`,
      180,
    );
    await runRemoteCommand(
      `更新 rosdep (${item.title})`,
      `bash -lc 'export ROSDISTRO_INDEX_URL=${ROSDISTRO_INDEX_URL} && rosdep update'`,
      300,
    );
    await runRemoteCommand(
      `安装依赖 (${item.title})`,
      `sudo bash -lc 'export HOME=/home/${user} && export ROS_HOME=/home/${user}/.ros && source /opt/ros/humble/setup.bash && export ROSDISTRO_INDEX_URL=${ROSDISTRO_INDEX_URL} && cd ${remoteDir} && rosdep install --from-paths src --ignore-src -r -y'`,
      600,
    );
    await runRemoteCommand(
      `构建工作区 (${item.title})`,
      `bash -lc 'source /opt/ros/humble/setup.bash && cd ${remoteDir} && colcon build'`,
      1200,
    );
    return;
  }

  await runRemoteCommand(
    `安装依赖 (${item.title})`,
    `python3 -m pip install ${remoteDir}`,
    180,
  );
  await runRemoteCommand(
    `赋权脚本 (${item.title})`,
    `chmod +x ${remoteDir}/scripts/install.sh`,
  );
  await runRemoteCommand(
    `运行安装脚本 (${item.title})`,
    `sudo bash ${remoteDir}/scripts/install.sh`,
    180,
  );
}

async function 读取远程整包清单(
  remoteExtractDir: string,
  runRemoteCommand: RunRemoteCommand,
): Promise<FullPackageManifest> {
  const output = await runRemoteCommand(
    '读取整包清单',
    `python3 - <<'PY'\nimport json\nfrom pathlib import Path\nmanifest_path = Path('${remoteExtractDir}/manifest.json')\nprint(json.dumps(json.loads(manifest_path.read_text(encoding='utf-8')), ensure_ascii=False))\nPY`,
    60,
  );
  const text = String(output ?? '').trim();
  if (!text) {
    throw new Error('读取整包清单失败：manifest.json 无输出');
  }
  const manifest = JSON.parse(text) as FullPackageManifest;
  if (!Array.isArray(manifest.items) || manifest.items.length === 0) {
    throw new Error('读取整包清单失败：items 为空');
  }
  return manifest;
}

type InstallPackageFromBase64Args = {
  type: PackageType;
  user: string;
  archiveBase64: string;
  archiveFileName: string;
  runRemoteCommand: RunRemoteCommand;
  uploadRemoteFile: UploadRemoteFile;
  onProgress?: (text: string) => void;
};

export async function installPackageFromBase64({
  type,
  user,
  archiveBase64,
  archiveFileName,
  runRemoteCommand,
  uploadRemoteFile,
  onProgress,
}: InstallPackageFromBase64Args): Promise<void> {
  const isGzip = archiveFileName.endsWith('.tar.gz');
  const remoteArchive = `/tmp/${PACKAGE_INSTALL_SPECS[type].name}${isGzip ? '.tar.gz' : '.tar'}`;

  onProgress?.(`上传 ${PACKAGE_INSTALL_SPECS[type].title}`);
  await uploadRemoteFile(remoteArchive, archiveBase64, PACKAGE_INSTALL_SPECS[type].title);
  await 安装远程压缩包({
    item: 构建默认清单项(type),
    user,
    remoteArchive,
    runRemoteCommand,
    onProgress,
  });
  await runRemoteCommand(`清理压缩包 (${PACKAGE_INSTALL_SPECS[type].title})`, `rm -f ${remoteArchive}`);
}

export async function installFullPackageFromBase64({
  user,
  archiveBase64,
  archiveFileName,
  runRemoteCommand,
  uploadRemoteFile,
  onProgress,
}: InstallFullPackageFromBase64Args): Promise<void> {
  const isGzip = archiveFileName.endsWith('.tar.gz');
  const remoteFullArchive = `/tmp/robot-full${isGzip ? '.tar.gz' : '.tar'}`;
  const remoteExtractDir = '/tmp/robot-full-extracted';

  onProgress?.('上传整包');
  await uploadRemoteFile(remoteFullArchive, archiveBase64, 'Robot Full');
  await runRemoteCommand('准备整包目录', `rm -rf ${remoteExtractDir} && mkdir -p ${remoteExtractDir}`);
  await runRemoteCommand(
    '解压整包',
    `tar ${isGzip ? '-xzf' : '-xf'} ${remoteFullArchive} -C ${remoteExtractDir}`,
    180,
  );

  const manifest = await 读取远程整包清单(remoteExtractDir, runRemoteCommand);
  const itemMap = new Map(manifest.items.map(item => [item.id, item]));
  const installOrder = manifest.install_order && manifest.install_order.length > 0
    ? manifest.install_order
    : manifest.items.map(item => item.id);

  for (const itemId of installOrder) {
    const item = itemMap.get(itemId);
    if (!item) {
      throw new Error(`整包清单缺少安装项: ${itemId}`);
    }
    const remoteArchive = `${remoteExtractDir}/packages/${item.archive_name}`;
    await runRemoteCommand(
      `检查子包 (${item.title})`,
      `test -f ${remoteArchive}`,
    );
    await 安装远程压缩包({
      item,
      user,
      remoteArchive,
      runRemoteCommand,
      onProgress,
    });
  }

  await runRemoteCommand(
    '清理整包临时文件',
    `rm -rf ${remoteExtractDir} && rm -f ${remoteFullArchive}`,
  );
}
