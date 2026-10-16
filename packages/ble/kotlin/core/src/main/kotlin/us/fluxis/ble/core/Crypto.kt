package us.fluxis.ble.core

import java.math.BigInteger
import java.security.AlgorithmParameters
import java.security.GeneralSecurityException
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.MessageDigest
import java.security.SecureRandom
import java.security.interfaces.ECPrivateKey
import java.security.interfaces.ECPublicKey
import java.security.spec.ECGenParameterSpec
import java.security.spec.ECParameterSpec
import java.security.spec.ECPoint
import java.security.spec.ECPrivateKeySpec
import java.security.spec.ECPublicKeySpec
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/** Ephemeral P-256 key pair; [publicKey] is the 65-byte uncompressed SEC1 encoding. */
public class P256KeyPair internal constructor(internal val privateKey: ECPrivateKey, publicKey: ByteArray) {
    private val publicBytes = publicKey.copyOf()
    public val publicKey: ByteArray get() = publicBytes.copyOf()

    public companion object {
        /** Builds a key pair from a known scalar and its public key (test vectors, fixtures). */
        @JvmStatic
        public fun fromRaw(privateScalar: ByteArray, publicKey: ByteArray): P256KeyPair {
            P256.validatePublicKey(publicKey)
            val spec = ECPrivateKeySpec(BigInteger(1, privateScalar), P256.params)
            val priv = KeyFactory.getInstance("EC").generatePrivate(spec) as ECPrivateKey
            return P256KeyPair(priv, publicKey)
        }
    }
}

/** P-256 helpers built only on JCA APIs present on Android API 26 and JVM 11. */
public object P256 {
    private val P = BigInteger("ffffffff00000001000000000000000000000000ffffffffffffffffffffffff", 16)
    private val A = P.subtract(BigInteger.valueOf(3))
    private val B = BigInteger("5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b", 16)

    internal val params: ECParameterSpec by lazy {
        AlgorithmParameters.getInstance("EC").run {
            init(ECGenParameterSpec("secp256r1"))
            getParameterSpec(ECParameterSpec::class.java)
        }
    }

    @JvmStatic
    public fun generate(random: SecureRandom = SecureRandom()): P256KeyPair {
        val kpg = KeyPairGenerator.getInstance("EC")
        kpg.initialize(ECGenParameterSpec("secp256r1"), random)
        val kp = kpg.generateKeyPair()
        return P256KeyPair(kp.private as ECPrivateKey, encode(kp.public as ECPublicKey))
    }

    /** Rejects anything but an uncompressed point that lies on P-256 (spec §5.4). */
    @JvmStatic
    public fun validatePublicKey(encoded: ByteArray): ECPublicKey {
        if (encoded.size != FluxisBle.PUBLIC_KEY_BYTES || encoded[0] != 0x04.toByte()) throw invalidKey()
        val x = BigInteger(1, encoded.copyOfRange(1, 33))
        val y = BigInteger(1, encoded.copyOfRange(33, 65))
        if (x >= P || y >= P) throw invalidKey()
        val lhs = y.multiply(y).mod(P)
        val rhs = x.modPow(BigInteger.valueOf(3), P).add(A.multiply(x)).add(B).mod(P)
        if (lhs != rhs) throw invalidKey()
        return try {
            KeyFactory.getInstance("EC").generatePublic(ECPublicKeySpec(ECPoint(x, y), params)) as ECPublicKey
        } catch (e: GeneralSecurityException) {
            throw FluxisBleProtocolException(ProtocolErrorCode.INVALID_KEY, cause = e)
        }
    }

    internal fun encode(key: ECPublicKey): ByteArray =
        byteArrayOf(0x04) + fixed32(key.w.affineX) + fixed32(key.w.affineY)

    /** ECDH shared secret: the 32-byte X coordinate. */
    internal fun ecdh(own: P256KeyPair, peerPublicKey: ByteArray): ByteArray {
        val peer = validatePublicKey(peerPublicKey)
        val ka = KeyAgreement.getInstance("ECDH")
        ka.init(own.privateKey)
        ka.doPhase(peer, true)
        return fixed32(BigInteger(1, ka.generateSecret()))
    }

    private fun fixed32(v: BigInteger): ByteArray {
        val raw = v.toByteArray()
        return when {
            raw.size == 32 -> raw
            raw.size == 33 && raw[0] == 0.toByte() -> raw.copyOfRange(1, 33)
            raw.size < 32 -> ByteArray(32 - raw.size) + raw
            else -> throw IllegalStateException("coordinate wider than 32 bytes")
        }
    }

    private fun invalidKey() = FluxisBleProtocolException(ProtocolErrorCode.INVALID_KEY)
}

internal object Primitives {
    fun sha256(vararg parts: ByteArray): ByteArray =
        MessageDigest.getInstance("SHA-256").run {
            parts.forEach { update(it) }
            digest()
        }

    fun hmacSha256(key: ByteArray, vararg parts: ByteArray): ByteArray =
        Mac.getInstance("HmacSHA256").run {
            init(SecretKeySpec(key, "HmacSHA256"))
            parts.forEach { update(it) }
            doFinal()
        }

    fun hkdfExtract(salt: ByteArray, ikm: ByteArray): ByteArray = hmacSha256(salt, ikm)

    fun hkdfExpand(prk: ByteArray, info: ByteArray, length: Int): ByteArray {
        require(length in 1..255 * 32)
        val out = java.io.ByteArrayOutputStream()
        var t = ByteArray(0)
        var counter = 1
        while (out.size() < length) {
            t = hmacSha256(prk, t, info, byteArrayOf(counter.toByte()))
            out.write(t)
            counter++
        }
        return out.toByteArray().copyOf(length)
    }

    fun aesGcmSeal(key: ByteArray, nonce: ByteArray, plaintext: ByteArray, aad: ByteArray): ByteArray =
        Cipher.getInstance("AES/GCM/NoPadding").run {
            init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, nonce))
            updateAAD(aad)
            doFinal(plaintext)
        }

    fun aesGcmOpen(key: ByteArray, nonce: ByteArray, ciphertextAndTag: ByteArray, aad: ByteArray): ByteArray? = try {
        Cipher.getInstance("AES/GCM/NoPadding").run {
            init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, nonce))
            updateAAD(aad)
            doFinal(ciphertextAndTag)
        }
    } catch (_: GeneralSecurityException) {
        null
    }

    fun constantTimeEquals(a: ByteArray, b: ByteArray): Boolean {
        if (a.size != b.size) return false
        var diff = 0
        for (i in a.indices) diff = diff or (a[i].toInt() xor b[i].toInt())
        return diff == 0
    }
}
