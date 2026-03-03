package com.sparkrobot.mdns

import android.util.Log
import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.sparkrobot.codegen.NativeSparkMdnsSpec

/**
 * 使用 BaseReactPackage（RN 0.84 推荐方式）以兼容 bridgeless 模式。
 * getModule() + getReactModuleInfoProvider() 向 TurboModuleRegistry 注册模块。
 * isTurboModule=true 配合 Codegen 生成的 C++ 绑定使模块在 JSI 层可见。
 */
class MdnsPackage : BaseReactPackage() {

    override fun getModule(
        name: String,
        reactContext: ReactApplicationContext,
    ): NativeModule? {
        Log.d("MdnsPackage", "getModule called with name=$name")
        return if (name == NativeSparkMdnsSpec.NAME) {
            Log.d("MdnsPackage", "Creating MdnsModule instance")
            MdnsModule(reactContext)
        } else {
            null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        Log.d("MdnsPackage", "getReactModuleInfoProvider called")
        return ReactModuleInfoProvider {
            mapOf(
                NativeSparkMdnsSpec.NAME to ReactModuleInfo(
                    NativeSparkMdnsSpec.NAME,               // name
                    MdnsModule::class.java.name,            // className (fully qualified)
                    false,                                  // canOverrideExistingModule
                    false,                                  // needsEagerInit
                    false,                                  // isCxxModule
                    true,                                   // isTurboModule ← Codegen TurboModule
                )
            )
        }
    }
}
