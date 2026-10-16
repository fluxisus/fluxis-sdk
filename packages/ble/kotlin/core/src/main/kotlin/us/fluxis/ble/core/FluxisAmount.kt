package us.fluxis.ble.core

import java.math.BigDecimal
import java.math.BigInteger

/**
 * An amount in minor units with an explicit number of decimal places:
 * `value = minorUnits × 10^(−scale)`. `FluxisAmount(1250, 2, "ARS")` is ARS 12.50.
 *
 * [currency] is an upper-case ISO 4217 code or asset ticker (`[A-Z0-9]{1,12}`), or `null` when
 * unspecified. The scale is kept as given, so `12.50` and `12.5` stay distinct for display.
 */
public class FluxisAmount(
    public val minorUnits: Long,
    public val scale: Int,
    public val currency: String? = null,
) {
    init {
        if (minorUnits < 0) throw FluxisBleProtocolException(ProtocolErrorCode.AMOUNT_OUT_OF_RANGE)
        if (scale !in 0..FluxisBle.MAX_SCALE) throw FluxisBleProtocolException(ProtocolErrorCode.SCALE_OUT_OF_RANGE)
        if (currency != null && !isValidCurrency(currency)) {
            throw FluxisBleProtocolException(ProtocolErrorCode.INVALID_CURRENCY)
        }
    }

    /** Plain decimal string with exactly [scale] fractional digits, e.g. `"12.50"`. */
    public fun toDecimalString(): String {
        val digits = minorUnits.toString()
        if (scale == 0) return digits
        val padded = digits.padStart(scale + 1, '0')
        return padded.substring(0, padded.length - scale) + "." + padded.substring(padded.length - scale)
    }

    public fun toBigDecimal(): BigDecimal = BigDecimal(BigInteger.valueOf(minorUnits), scale)

    override fun toString(): String = if (currency == null) toDecimalString() else "$currency ${toDecimalString()}"

    override fun equals(other: Any?): Boolean =
        other is FluxisAmount && other.minorUnits == minorUnits && other.scale == scale && other.currency == currency

    override fun hashCode(): Int = (minorUnits.hashCode() * 31 + scale) * 31 + (currency?.hashCode() ?: 0)

    public companion object {
        private val DECIMAL = Regex("(0|[1-9][0-9]*)(\\.[0-9]+)?")

        /**
         * Parses a plain decimal string (`"12.50"`, `"1500"`, `"0.000001"`). Signs, exponents,
         * thousands separators, whitespace and leading zeros are rejected. [currency] `null` or
         * empty means unspecified.
         */
        @JvmStatic
        @JvmOverloads
        public fun parse(decimal: String, currency: String? = null): FluxisAmount {
            if (!DECIMAL.matches(decimal)) throw FluxisBleProtocolException(ProtocolErrorCode.INVALID_DECIMAL)
            val dot = decimal.indexOf('.')
            val scale = if (dot < 0) 0 else decimal.length - dot - 1
            if (scale > FluxisBle.MAX_SCALE) throw FluxisBleProtocolException(ProtocolErrorCode.SCALE_OUT_OF_RANGE)
            val minor = decimal.replace(".", "").toLongOrNull()
                ?: throw FluxisBleProtocolException(ProtocolErrorCode.AMOUNT_OUT_OF_RANGE)
            return FluxisAmount(minor, scale, currency?.takeIf { it.isNotEmpty() })
        }

        /** Converts a [BigDecimal], keeping its scale (normalised to ≥ 0). */
        @JvmStatic
        @JvmOverloads
        public fun of(value: BigDecimal, currency: String? = null): FluxisAmount {
            val normalized = if (value.scale() < 0) value.setScale(0) else value
            if (normalized.signum() < 0) throw FluxisBleProtocolException(ProtocolErrorCode.AMOUNT_OUT_OF_RANGE)
            return parse(normalized.toPlainString(), currency)
        }

        internal fun isValidCurrency(currency: String): Boolean =
            currency.length in 1..FluxisBle.MAX_CURRENCY_CHARS && currency.all { it in 'A'..'Z' || it in '0'..'9' }
    }
}
