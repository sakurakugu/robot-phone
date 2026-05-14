package com.sparkrobot

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.sparkrobot.audio.PcmAudioPackage
import com.sparkrobot.mdns.MdnsPackage
import com.sparkrobot.ssh.SshPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
        context = applicationContext,
        packageList =
        PackageList(this).packages.apply {
          add(PcmAudioPackage())
          add(MdnsPackage())
          add(SshPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
