package com.sparkrobot.mdns

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.sparkrobot.codegen.NativeSparkMdnsSpec
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean

/**
 * React Native 原生模块：通过 Android NsdManager 发现局域网内的 SparkRobot 机器人。
 *
 * 机器人 agent 端使用 zeroconf 注册 `_sparkrobot._tcp.local.` 服务，
 * TXT record 包含 uuid / name / model / version / ip / port。
 *
 * 继承 Codegen 生成的 NativeSparkMdnsSpec 抽象类，通过 C++ JSI 绑定注册
 * 为 TurboModule，在 bridgeless 模式下正常工作。
 */
@ReactModule(name = NativeSparkMdnsSpec.NAME)
class MdnsModule(reactContext: ReactApplicationContext) :
    NativeSparkMdnsSpec(reactContext) {

    init {
        Log.d(TAG, "MdnsModule created, name=${NativeSparkMdnsSpec.NAME}")
    }

    companion object {
        private const val TAG = "MdnsModule"
        private const val SERVICE_TYPE = "_sparkrobot._tcp."
    }

    @ReactMethod
    override fun scan(timeoutSeconds: Double, promise: Promise) {
        Log.d(TAG, "scan() called with timeout=$timeoutSeconds")
        val context = reactApplicationContext
        val nsdManager =
            context.getSystemService(Context.NSD_SERVICE) as? NsdManager
        if (nsdManager == null) {
            promise.reject("NSD_UNAVAILABLE", "NsdManager 不可用")
            return
        }

        // 获取 multicast 锁，确保能收到 mDNS 组播包
        val wifiManager =
            context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
        val multicastLock = wifiManager?.createMulticastLock("sparkMdnsLock")
        multicastLock?.setReferenceCounted(true)
        multicastLock?.acquire()

        val pendingServices = ConcurrentLinkedQueue<NsdServiceInfo>()
        val results = mutableMapOf<String, WritableMap>()
        val promiseSettled = AtomicBoolean(false)
        val handler = Handler(Looper.getMainLooper())

        fun finish() {
            if (!promiseSettled.compareAndSet(false, true)) return
            try { multicastLock?.release() } catch (_: Exception) {}
            val array = Arguments.createArray()
            synchronized(results) { results.values.forEach { array.pushMap(it) } }
            promise.resolve(array)
        }

        // 逐个 resolve（NsdManager 在 API < 34 不支持并行 resolve）
        fun resolveNext() {
            val service = pendingServices.poll()
            if (service == null) {
                finish()
                return
            }
            @Suppress("DEPRECATION")
            nsdManager.resolveService(service, object : NsdManager.ResolveListener {
                override fun onResolveFailed(si: NsdServiceInfo, errorCode: Int) {
                    resolveNext()
                }

                @Suppress("DEPRECATION")
                override fun onServiceResolved(si: NsdServiceInfo) {
                    try {
                        val attrs = si.attributes
                        val uuid = attrs["uuid"]?.decodeToString() ?: return
                        val name = attrs["name"]?.decodeToString() ?: si.serviceName
                        val model = attrs["model"]?.decodeToString() ?: ""
                        val version = attrs["version"]?.decodeToString() ?: ""
                        val ip = attrs["ip"]?.decodeToString()
                            ?: si.host?.hostAddress ?: ""
                        val port = attrs["port"]?.decodeToString()?.toIntOrNull()
                            ?: si.port

                        val map = Arguments.createMap().apply {
                            putString("uuid", uuid)
                            putString("name", name)
                            putString("model", model)
                            putString("version", version)
                            putString("ip", ip)
                            putInt("port", port)
                        }
                        synchronized(results) { results[uuid] = map }
                    } catch (_: Exception) {
                        // 跳过解析异常的服务
                    } finally {
                        resolveNext()
                    }
                }
            })
        }

        val discoveryListener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(serviceType: String) {}

            override fun onServiceFound(serviceInfo: NsdServiceInfo) {
                pendingServices.add(serviceInfo)
            }

            override fun onServiceLost(serviceInfo: NsdServiceInfo) {}
            override fun onDiscoveryStopped(serviceType: String) {}

            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                try { multicastLock?.release() } catch (_: Exception) {}
                if (promiseSettled.compareAndSet(false, true)) {
                    promise.reject(
                        "DISCOVERY_FAILED",
                        "启动服务发现失败，错误码：$errorCode",
                    )
                }
            }

            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {}
        }

        nsdManager.discoverServices(
            SERVICE_TYPE,
            NsdManager.PROTOCOL_DNS_SD,
            discoveryListener,
        )

        // 超时后停止发现并开始逐个 resolve
        handler.postDelayed({
            try {
                nsdManager.stopServiceDiscovery(discoveryListener)
            } catch (_: Exception) {}
            // 稍等以收集最后的回调，然后开始 resolve
            handler.postDelayed({ resolveNext() }, 300)
        }, (timeoutSeconds * 1000).toLong())
    }
}
