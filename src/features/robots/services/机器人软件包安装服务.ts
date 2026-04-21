export type PackageType = 'common' | 'server' | 'agent' | 'ros' | 'runtime';

export type PackageInstallSpec = {
  key: PackageType;
  name: string;
  title: string;
  archiveName: string;
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
  },
  server: {
    key: 'server',
    name: 'robot-server',
    title: 'Robot Server',
    archiveName: 'robot-server.tar.gz',
  },
  agent: {
    key: 'agent',
    name: 'robot-agent',
    title: 'Robot Agent',
    archiveName: 'robot-agent.tar.gz',
  },
  ros: {
    key: 'ros',
    name: 'robot-ros',
    title: 'Robot ROS',
    archiveName: 'robot-ros.tar.gz',
  },
  runtime: {
    key: 'runtime',
    name: 'robot-runtime',
    title: 'Robot Runtime',
    archiveName: 'robot-runtime.tar.gz',
  },
};

export type RunRemoteCommand = (
  title: string,
  command: string,
  timeoutSeconds?: number,
) => Promise<void>;

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

async function 安装远程压缩包(args: {
  type: PackageType;
  user: string;
  remoteArchive: string;
  runRemoteCommand: RunRemoteCommand;
  onProgress?: (text: string) => void;
}) {
  const { type, user, remoteArchive, runRemoteCommand, onProgress } = args;
  const spec = PACKAGE_INSTALL_SPECS[type];
  const remoteDir = `/home/${user}/sparkrobot/${spec.name}`;
  const isGzip = remoteArchive.endsWith('.tar.gz');

  onProgress?.(`安装 ${spec.title}`);
  await runRemoteCommand(`创建目录 (${spec.title})`, `mkdir -p ${remoteDir}`);
  await runRemoteCommand(
    `修正权限 (${spec.title})`,
    `sudo chown -R ${user}:${user} ${remoteDir}`,
  );
  if (type === 'ros') {
    await runRemoteCommand(
      `清理旧构建目录 (${spec.title})`,
      `rm -rf ${remoteDir}/build ${remoteDir}/install ${remoteDir}/log`,
    );
  }
  await runRemoteCommand(
    `解压安装包 (${spec.title})`,
    `tar ${isGzip ? '-xzf' : '-xf'} ${remoteArchive} -C ${remoteDir}`,
    type === 'ros' ? 300 : 180,
  );

  if (type === 'common') {
    await runRemoteCommand(
      `安装依赖 (${spec.title})`,
      'python3 -m pip install --upgrade pip setuptools wheel uuid6 watchdog',
      180,
    );
    await runRemoteCommand(
      `安装包 (${spec.title})`,
      `python3 -m pip install -e ${remoteDir}`,
      180,
    );
    return;
  }

  if (type === 'ros') {
    const rosdepSources = ROSDEP_SOURCES_LIST_CONTENT.replace(/'/g, `'"'"'`);
    await runRemoteCommand(
      `检查 ROS2 环境 (${spec.title})`,
      "bash -lc 'test -f /opt/ros/humble/setup.bash'",
    );
    await runRemoteCommand(
      `初始化 rosdep (${spec.title})`,
      "sudo bash -lc 'if [ ! -f /etc/ros/rosdep/sources.list.d/20-default.list ]; then rosdep init; fi'",
      180,
    );
    await runRemoteCommand(
      `切换 rosdep 镜像源 (${spec.title})`,
      `sudo bash -lc 'cat > /etc/ros/rosdep/sources.list.d/20-default.list <<'"'"'EOF'"'"'\n${rosdepSources}\nEOF'`,
      180,
    );
    await runRemoteCommand(
      `更新 rosdep (${spec.title})`,
      `bash -lc 'export ROSDISTRO_INDEX_URL=${ROSDISTRO_INDEX_URL} && rosdep update'`,
      300,
    );
    await runRemoteCommand(
      `安装依赖 (${spec.title})`,
      `sudo bash -lc 'export HOME=/home/${user} && export ROS_HOME=/home/${user}/.ros && source /opt/ros/humble/setup.bash && export ROSDISTRO_INDEX_URL=${ROSDISTRO_INDEX_URL} && cd ${remoteDir} && rosdep install --from-paths src --ignore-src -r -y'`,
      600,
    );
    await runRemoteCommand(
      `构建工作区 (${spec.title})`,
      `bash -lc 'source /opt/ros/humble/setup.bash && cd ${remoteDir} && colcon build'`,
      1200,
    );
    return;
  }

  await runRemoteCommand(
    `安装依赖 (${spec.title})`,
    `python3 -m pip install ${remoteDir}`,
    180,
  );
  await runRemoteCommand(
    `赋权脚本 (${spec.title})`,
    `chmod +x ${remoteDir}/scripts/install.sh`,
  );
  await runRemoteCommand(
    `运行安装脚本 (${spec.title})`,
    `sudo bash ${remoteDir}/scripts/install.sh`,
    180,
  );
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
    type,
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

  for (const type of PACKAGE_INSTALL_ORDER) {
    const spec = PACKAGE_INSTALL_SPECS[type];
    const remoteArchive = `${remoteExtractDir}/packages/${spec.archiveName}`;
    await runRemoteCommand(
      `检查子包 (${spec.title})`,
      `test -f ${remoteArchive}`,
    );
    await 安装远程压缩包({
      type,
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
