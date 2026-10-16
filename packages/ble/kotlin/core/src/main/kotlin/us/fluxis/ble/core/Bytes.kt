package us.fluxis.ble.core

import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.charset.CharacterCodingException
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets

internal class ByteReader(private val data: ByteArray) {
    private var pos = 0

    fun take(n: Int): ByteArray {
        if (n < 0 || pos + n > data.size) throw FluxisBleProtocolException(ProtocolErrorCode.TRUNCATED)
        return data.copyOfRange(pos, pos + n).also { pos += n }
    }

    fun u8(): Int = take(1)[0].toInt() and 0xFF

    fun u32(): Long = take(4).fold(0L) { acc, b -> (acc shl 8) or (b.toLong() and 0xFF) }

    /** Raw 64-bit value; values ≥ 2^63 come back negative. */
    fun u64(): Long = take(8).fold(0L) { acc, b -> (acc shl 8) or (b.toLong() and 0xFF) }

    fun remaining(): Int = data.size - pos
}

internal class ByteWriter {
    private val out = ByteArrayOutputStream()

    fun u8(v: Int) = apply { out.write(v and 0xFF) }

    fun u32(v: Long) = apply { for (shift in 24 downTo 0 step 8) out.write(((v shr shift) and 0xFF).toInt()) }

    fun u64(v: Long) = apply { for (shift in 56 downTo 0 step 8) out.write(((v shr shift) and 0xFF).toInt()) }

    fun bytes(b: ByteArray) = apply { out.write(b) }

    fun toByteArray(): ByteArray = out.toByteArray()
}

internal fun decodeUtf8Strict(bytes: ByteArray): String? = try {
    StandardCharsets.UTF_8.newDecoder()
        .onMalformedInput(CodingErrorAction.REPORT)
        .onUnmappableCharacter(CodingErrorAction.REPORT)
        .decode(ByteBuffer.wrap(bytes))
        .toString()
} catch (_: CharacterCodingException) {
    null
}

/** Lower-case hex, handy for logs and tests. */
public fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it.toInt() and 0xFF) }

public fun String.hexToBytes(): ByteArray {
    require(length % 2 == 0) { "odd-length hex" }
    return ByteArray(length / 2) { i -> substring(i * 2, i * 2 + 2).toInt(16).toByte() }
}
