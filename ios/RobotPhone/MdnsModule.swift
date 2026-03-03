import Foundation

/**
 React Native 原生模块：通过 iOS NetServiceBrowser 发现局域网内的 SparkRobot 机器人。

 机器人 agent 端注册 `_sparkrobot._tcp.` Bonjour 服务，
 TXT record 包含 uuid / name / model / version / ip / port。
 */
@objc(SparkMdns)
class MdnsModule: NSObject {

  private static let serviceType = "_sparkrobot._tcp."
  private static let serviceDomain = "local."

  private var browser: NetServiceBrowser?
  private var discoveredServices: [NetService] = []
  private var resolvedResults: [[String: Any]] = []
  private var pendingResolves = 0
  private var resolveBlock: RCTPromiseResolveBlock?
  private var rejectBlock: RCTPromiseRejectBlock?
  private var timeoutTimer: Timer?

  // 需要在主队列上操作 NetService
  @objc static func requiresMainQueueSetup() -> Bool { true }

  @objc
  func scan(_ timeoutSeconds: Double,
            resolve: @escaping RCTPromiseResolveBlock,
            reject: @escaping RCTPromiseRejectBlock) {
    // 清理上次的状态
    cleanup()

    resolveBlock = resolve
    rejectBlock = reject
    resolvedResults = []
    discoveredServices = []
    pendingResolves = 0

    let b = NetServiceBrowser()
    b.delegate = self
    browser = b
    b.searchForServices(ofType: MdnsModule.serviceType, inDomain: MdnsModule.serviceDomain)

    // 超时后停止搜索并返回结果
    timeoutTimer = Timer.scheduledTimer(withTimeInterval: timeoutSeconds, repeats: false) { [weak self] _ in
      self?.stopAndResolve()
    }
  }

  private func stopAndResolve() {
    browser?.stop()
    browser?.delegate = nil
    browser = nil
    timeoutTimer?.invalidate()
    timeoutTimer = nil

    if discoveredServices.isEmpty {
      finishWithResults()
      return
    }

    // 逐个 resolve
    resolveAllServices()
  }

  private func resolveAllServices() {
    pendingResolves = discoveredServices.count
    for service in discoveredServices {
      service.delegate = self
      service.resolve(withTimeout: 5.0)
    }
  }

  private func finishWithResults() {
    guard let resolve = resolveBlock else { return }
    resolve(resolvedResults)
    resolveBlock = nil
    rejectBlock = nil
    discoveredServices = []
  }

  private func cleanup() {
    timeoutTimer?.invalidate()
    timeoutTimer = nil
    browser?.stop()
    browser?.delegate = nil
    browser = nil
    for s in discoveredServices { s.delegate = nil; s.stop() }
    discoveredServices = []
    resolvedResults = []
    resolveBlock = nil
    rejectBlock = nil
  }

  private func parseTxtRecord(_ data: Data) -> [String: String] {
    let dict = NetService.dictionary(fromTXTRecord: data)
    var result: [String: String] = [:]
    for (key, value) in dict {
      result[key] = String(data: value, encoding: .utf8) ?? ""
    }
    return result
  }

  private func ipAddress(from service: NetService) -> String? {
    guard let addresses = service.addresses else { return nil }
    for addrData in addresses {
      var hostname = [CChar](repeating: 0, count: Int(NI_MAXHOST))
      let result = addrData.withUnsafeBytes { ptr -> Int32 in
        guard let baseAddr = ptr.baseAddress else { return -1 }
        let sockAddr = baseAddr.assumingMemoryBound(to: sockaddr.self)
        return getnameinfo(
          sockAddr,
          socklen_t(addrData.count),
          &hostname,
          socklen_t(hostname.count),
          nil,
          0,
          NI_NUMERICHOST
        )
      }
      if result == 0 {
        let addr = String(cString: hostname)
        // 优先返回 IPv4 地址
        if !addr.contains(":") { return addr }
      }
    }
    return nil
  }
}

// MARK: - NetServiceBrowserDelegate
extension MdnsModule: NetServiceBrowserDelegate {
  func netServiceBrowser(_ browser: NetServiceBrowser,
                         didFind service: NetService,
                         moreComing: Bool) {
    discoveredServices.append(service)
  }

  func netServiceBrowser(_ browser: NetServiceBrowser,
                         didNotSearch errorDict: [String : NSNumber]) {
    guard let reject = rejectBlock else { return }
    reject("DISCOVERY_FAILED", "搜索失败: \(errorDict)", nil)
    cleanup()
  }
}

// MARK: - NetServiceDelegate
extension MdnsModule: NetServiceDelegate {
  func netServiceDidResolveAddress(_ sender: NetService) {
    let txtData = sender.txtRecordData() ?? Data()
    let attrs = parseTxtRecord(txtData)

    if let uuid = attrs["uuid"], !uuid.isEmpty {
      let name = attrs["name"] ?? sender.name
      let model = attrs["model"] ?? ""
      let version = attrs["version"] ?? ""
      let ip = attrs["ip"] ?? ipAddress(from: sender) ?? ""
      let port = Int(attrs["port"] ?? "") ?? sender.port

      resolvedResults.append([
        "uuid": uuid,
        "name": name,
        "model": model,
        "version": version,
        "ip": ip,
        "port": port,
      ])
    }

    sender.delegate = nil
    pendingResolves -= 1
    if pendingResolves <= 0 { finishWithResults() }
  }

  func netService(_ sender: NetService,
                  didNotResolve errorDict: [String : NSNumber]) {
    sender.delegate = nil
    pendingResolves -= 1
    if pendingResolves <= 0 { finishWithResults() }
  }
}
