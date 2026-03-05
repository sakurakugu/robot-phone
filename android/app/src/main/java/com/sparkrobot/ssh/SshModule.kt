package com.sparkrobot.ssh

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import com.jcraft.jsch.ChannelExec
import com.jcraft.jsch.JSch
import com.jcraft.jsch.Session
import com.sparkrobot.codegen.NativeSparkSshSpec
import java.io.ByteArrayOutputStream

/**
 * React Native 原生模块：通过 JSch 实现 SSH 长连接。
 *
 * 工作原理：
 *  - connect() 建立并保持单个 JSch Session
 *  - execute() 对每条命令开启 exec 频道并收集输出，频道用完即关闭，Session 保持
 *  - disconnect() 主动关闭 Session
 *
 * 继承 Codegen 生成的 NativeSparkSshSpec 抽象类，通过 C++ JSI 绑定注册为 TurboModule。
 */
@ReactModule(name = NativeSparkSshSpec.NAME)
class SshModule(reactContext: ReactApplicationContext) : NativeSparkSshSpec(reactContext) {

    @Volatile
    private var session: Session? = null

    companion object {
        private const val TAG = "SshModule"
        private const val CONNECT_TIMEOUT_MS = 15_000
    }

    init {
        Log.d(TAG, "SshModule created, name=${NativeSparkSshSpec.NAME}")
    }

    @ReactMethod
    override fun connect(
        host: String,
        port: Double,
        username: String,
        password: String,
        promise: Promise,
    ) {
        Thread {
            // 先断开已有连接
            closeSession()

            try {
                val jsch = JSch()
                val sess = jsch.getSession(username, host, port.toInt())
                sess.setPassword(password)
                sess.setConfig("StrictHostKeyChecking", "no")
                sess.setConfig("PreferredAuthentications", "password")
                sess.connect(CONNECT_TIMEOUT_MS)
                session = sess
                Log.d(TAG, "已连接到 $host:${port.toInt()}")
                promise.resolve(null)
            } catch (e: Exception) {
                Log.e(TAG, "连接失败: ${e.message}")
                promise.reject("SSH_CONNECT_ERROR", e.message ?: "连接失败")
            }
        }.start()
    }

    @ReactMethod
    override fun disconnect(promise: Promise) {
        closeSession()
        Log.d(TAG, "已断开连接")
        promise.resolve(null)
    }

    override fun isConnected(): Boolean {
        return session?.isConnected == true
    }

    @ReactMethod
    override fun execute(command: String, timeoutSeconds: Double, promise: Promise) {
        Thread {
            val sess = session
            if (sess == null || !sess.isConnected) {
                promise.reject("SSH_NOT_CONNECTED", "未建立 SSH 连接，请先连接")
                return@Thread
            }

            var channel: ChannelExec? = null
            try {
                channel = sess.openChannel("exec") as ChannelExec
                channel.setCommand(command)
                channel.inputStream = null

                val stdout = ByteArrayOutputStream()
                val stderr = ByteArrayOutputStream()
                channel.outputStream = stdout
                channel.setErrStream(stderr)

                channel.connect()

                // 等待命令执行完毕
                val timeoutMs = (timeoutSeconds * 1000).toLong().coerceAtLeast(5_000)
                val deadline = System.currentTimeMillis() + timeoutMs
                while (!channel.isClosed && System.currentTimeMillis() < deadline) {
                    Thread.sleep(100)
                }

                val out = stdout.toString("UTF-8")
                val err = stderr.toString("UTF-8")
                // stdout 和 stderr 合并返回，stderr 追加在后面
                val combined = if (err.isNotEmpty()) out + err else out
                promise.resolve(combined)
            } catch (e: Exception) {
                Log.e(TAG, "命令执行失败: ${e.message}")
                promise.reject("SSH_EXECUTE_ERROR", e.message ?: "命令执行失败")
            } finally {
                channel?.disconnect()
            }
        }.start()
    }

    override fun invalidate() {
        closeSession()
        super.invalidate()
    }

    private fun closeSession() {
        try {
            session?.disconnect()
        } catch (_: Exception) {}
        session = null
    }
}
