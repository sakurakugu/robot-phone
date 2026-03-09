import type { PackageType } from '../api';

export type PackageInstallSpec = {
  key: PackageType;
  name: string;
  title: string;
  archiveName: string;
};

export const PACKAGE_INSTALL_ORDER: PackageType[] = ['common', 'server', 'agent'];

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
  const spec = PACKAGE_INSTALL_SPECS[type];
  const remoteDir = `/home/${user}/sparkrobot/${spec.name}`;
  const isGzip = archiveFileName.endsWith('.tar.gz');
  const remoteArchive = `/tmp/${spec.name}${isGzip ? '.tar.gz' : '.tar'}`;

  onProgress?.(`上传 ${spec.title}`);
  await uploadRemoteFile(remoteArchive, archiveBase64, spec.title);

  onProgress?.(`安装 ${spec.title}`);
  await runRemoteCommand(`创建目录 (${spec.title})`, `mkdir -p ${remoteDir}`);
  await runRemoteCommand(
    `修正权限 (${spec.title})`,
    `sudo chown -R ${user}:${user} ${remoteDir}`,
  );
  await runRemoteCommand(
    `解压安装包 (${spec.title})`,
    `tar ${isGzip ? '-xzf' : '-xf'} ${remoteArchive} -C ${remoteDir}`,
    180,
  );
  await runRemoteCommand(`清理压缩包 (${spec.title})`, `rm -f ${remoteArchive}`);

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
