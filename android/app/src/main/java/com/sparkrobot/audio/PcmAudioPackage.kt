package com.sparkrobot.audio

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.sparkrobot.codegen.NativeSparkPcmAudioSpec

class PcmAudioPackage : BaseReactPackage() {

    override fun getModule(
        name: String,
        reactContext: ReactApplicationContext,
    ): NativeModule? {
        return if (name == NativeSparkPcmAudioSpec.NAME) {
            PcmAudioModule(reactContext)
        } else {
            null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            mapOf(
                NativeSparkPcmAudioSpec.NAME to ReactModuleInfo(
                    NativeSparkPcmAudioSpec.NAME,
                    PcmAudioModule::class.java.name,
                    false,
                    false,
                    false,
                    true,
                ),
            )
        }
    }
}
