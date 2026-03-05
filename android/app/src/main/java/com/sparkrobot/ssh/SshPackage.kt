package com.sparkrobot.ssh

import android.util.Log
import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.sparkrobot.codegen.NativeSparkSshSpec

/**
 * 使用 BaseReactPackage（RN 0.84 推荐方式）以兼容 bridgeless 模式。
 * getModule() + getReactModuleInfoProvider() 向 TurboModuleRegistry 注册模块。
 * isTurboModule=true 配合 Codegen 生成的 C++ 绑定使模块在 JSI 层可见。
 */
class SshPackage : BaseReactPackage() {

    override fun getModule(
        name: String,
        reactContext: ReactApplicationContext,
    ): NativeModule? {
        Log.d("SshPackage", "getModule called with name=$name")
        return if (name == NativeSparkSshSpec.NAME) {
            Log.d("SshPackage", "Creating SshModule instance")
            SshModule(reactContext)
        } else {
            null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        Log.d("SshPackage", "getReactModuleInfoProvider called")
        return ReactModuleInfoProvider {
            mapOf(
                NativeSparkSshSpec.NAME to ReactModuleInfo(
                    NativeSparkSshSpec.NAME,                // name
                    SshModule::class.java.name,             // className (fully qualified)
                    false,                                  // canOverrideExistingModule
                    false,                                  // needsEagerInit
                    false,                                  // isCxxModule
                    true,                                   // isTurboModule ← Codegen TurboModule
                )
            )
        }
    }
}
