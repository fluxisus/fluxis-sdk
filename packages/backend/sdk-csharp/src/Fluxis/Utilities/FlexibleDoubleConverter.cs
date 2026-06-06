using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Fluxis.Utilities;

/// <summary>
/// Deserializes JSON numbers or numeric strings into nullable doubles.
/// </summary>
public sealed class FlexibleDoubleConverter : JsonConverter<double?>
{
    /// <inheritdoc />
    public override double? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        switch (reader.TokenType)
        {
            case JsonTokenType.Null:
                return null;
            case JsonTokenType.Number:
                return reader.GetDouble();
            case JsonTokenType.String:
                var text = reader.GetString();
                if (string.IsNullOrWhiteSpace(text))
                {
                    return null;
                }

                return double.Parse(text, CultureInfo.InvariantCulture);
            default:
                throw new JsonException($"Cannot convert {reader.TokenType} to double.");
        }
    }

    /// <inheritdoc />
    public override void Write(Utf8JsonWriter writer, double? value, JsonSerializerOptions options)
    {
        if (value is null)
        {
            writer.WriteNullValue();
            return;
        }

        writer.WriteNumberValue(value.Value);
    }
}
