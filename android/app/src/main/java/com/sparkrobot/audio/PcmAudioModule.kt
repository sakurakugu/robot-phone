package com.sparkrobot.audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Build
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.sparkrobot.codegen.NativeSparkPcmAudioSpec
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

@ReactModule(name = NativeSparkPcmAudioSpec.NAME)
class PcmAudioModule(reactContext: ReactApplicationContext) :
    NativeSparkPcmAudioSpec(reactContext) {

    companion object {
        private const val TAG = "PcmAudioModule"
        private const val BYTES_PER_SAMPLE = 2
    }

    private val audioExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    @Volatile
    private var audioTrack: AudioTrack? = null
    @Volatile
    private var totalFramesWritten: Long = 0
    @Volatile
    private var bytesPerFrame: Int = BYTES_PER_SAMPLE

    override fun startStream(sampleRate: Double, channels: Double) {
        val targetSampleRate = sampleRate.toInt().coerceAtLeast(8000)
        val targetChannels = channels.toInt().coerceIn(1, 2)
        audioExecutor.execute {
            try {
                releaseTrack()
                totalFramesWritten = 0
                bytesPerFrame = targetChannels * BYTES_PER_SAMPLE
                audioTrack = createAudioTrack(targetSampleRate, targetChannels).also {
                    it.play()
                }
            } catch (error: Exception) {
                Log.e(TAG, "启动 PCM 流式播放失败", error)
                releaseTrack()
            }
        }
    }

    override fun appendChunk(base64: String) {
        if (base64.isBlank()) {
            return
        }
        audioExecutor.execute {
            val track = audioTrack ?: return@execute
            try {
                val bytes = Base64.decode(base64, Base64.DEFAULT)
                if (bytes.isEmpty()) {
                    return@execute
                }
                var offset = 0
                while (offset < bytes.size) {
                    val written = track.write(bytes, offset, bytes.size - offset)
                    if (written <= 0) {
                        break
                    }
                    offset += written
                    totalFramesWritten += written / bytesPerFrame
                }
            } catch (error: Exception) {
                Log.e(TAG, "写入 PCM 分片失败", error)
            }
        }
    }

    override fun stopStream() {
        audioExecutor.execute {
            val track = audioTrack
            if (track == null) {
                releaseTrack()
                return@execute
            }
            try {
                等待缓冲播放完成(track)
                track.stop()
            } catch (_: Exception) {
            } finally {
                releaseTrack()
            }
        }
    }

    override fun reset() {
        audioExecutor.execute {
            releaseTrack()
        }
    }

    override fun invalidate() {
        super.invalidate()
        reset()
        audioExecutor.shutdown()
    }

    private fun createAudioTrack(sampleRate: Int, channels: Int): AudioTrack {
        val channelConfig =
            if (channels == 2) AudioFormat.CHANNEL_OUT_STEREO else AudioFormat.CHANNEL_OUT_MONO
        val minBufferSize = AudioTrack.getMinBufferSize(
            sampleRate,
            channelConfig,
            AudioFormat.ENCODING_PCM_16BIT,
        ).coerceAtLeast(sampleRate * channels * BYTES_PER_SAMPLE / 2)

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build(),
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(sampleRate)
                        .setChannelMask(channelConfig)
                        .build(),
                )
                .setBufferSizeInBytes(minBufferSize * 2)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()
        } else {
            @Suppress("DEPRECATION")
            AudioTrack(
                AudioManager.STREAM_MUSIC,
                sampleRate,
                channelConfig,
                AudioFormat.ENCODING_PCM_16BIT,
                minBufferSize * 2,
                AudioTrack.MODE_STREAM,
            )
        }
    }

    private fun releaseTrack() {
        val current = audioTrack
        audioTrack = null
        totalFramesWritten = 0
        if (current == null) {
            return
        }
        try {
            current.pause()
        } catch (_: Exception) {
        }
        try {
            current.flush()
        } catch (_: Exception) {
        }
        try {
            current.release()
        } catch (_: Exception) {
        }
    }

    private fun 等待缓冲播放完成(track: AudioTrack) {
        val sampleRate = track.sampleRate
        if (sampleRate <= 0) {
            return
        }

        repeat(40) {
            val playedFrames = track.playbackHeadPosition.toLong() and 0xFFFFFFFFL
            val remainingFrames = totalFramesWritten - playedFrames
            if (remainingFrames <= 0) {
                return
            }
            val sleepMs = ((remainingFrames * 1000L) / sampleRate).coerceIn(10L, 120L)
            try {
                Thread.sleep(sleepMs)
            } catch (_: InterruptedException) {
                Thread.currentThread().interrupt()
                return
            }
        }
    }
}
