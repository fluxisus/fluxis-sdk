using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Fluxis.Utilities;
using Xunit;

namespace Fluxis.Tests;

public class WebhookVerifierTests
{
    private const string TestSecret = "whsec_test_secret_12345";

    [Fact]
    public void VerifySignature_WithValidSignature_ReturnsTrue()
    {
        var payload = ParseJson("""{"id":"pay-1","status":"completed"}""");
        var timestamp = CurrentTimestamp();
        var signature = ComputeSignature(payload, timestamp, TestSecret);

        WebhookVerifier.VerifySignature(payload, signature, timestamp, TestSecret)
            .Should().BeTrue();
    }

    [Fact]
    public void VerifySignature_WithDifferentKeyOrder_ReturnsTrue()
    {
        var payload = ParseJson("""{"status":"completed","id":"pay-1"}""");
        var timestamp = CurrentTimestamp();
        var signature = ComputeSignature(
            ParseJson("""{"id":"pay-1","status":"completed"}"""),
            timestamp,
            TestSecret);

        WebhookVerifier.VerifySignature(payload, signature, timestamp, TestSecret)
            .Should().BeTrue();
    }

    [Fact]
    public void VerifySignature_WithInvalidSignature_ReturnsFalse()
    {
        var payload = ParseJson("""{"event":"payment.completed"}""");

        WebhookVerifier.VerifySignature(payload, "invalid_signature", CurrentTimestamp(), TestSecret)
            .Should().BeFalse();
    }

    [Fact]
    public void VerifySignature_WithWrongSecret_ReturnsFalse()
    {
        var payload = ParseJson("""{"id":"pay-1","status":"completed"}""");
        var timestamp = CurrentTimestamp();
        var signature = ComputeSignature(payload, timestamp, TestSecret);

        WebhookVerifier.VerifySignature(payload, signature, timestamp, "wrong_secret")
            .Should().BeFalse();
    }

    [Fact]
    public void VerifySignature_WithTamperedPayload_ReturnsFalse()
    {
        var payload = ParseJson("""{"id":"pay-1","status":"completed"}""");
        var timestamp = CurrentTimestamp();
        var signature = ComputeSignature(payload, timestamp, TestSecret);

        WebhookVerifier.VerifySignature(
                ParseJson("""{"id":"pay-1","status":"failed"}"""),
                signature,
                timestamp,
                TestSecret)
            .Should().BeFalse();
    }

    [Fact]
    public void VerifySignature_WithExpiredTimestamp_ReturnsFalse()
    {
        var payload = ParseJson("""{"id":"pay-1","status":"completed"}""");
        var timestamp = (DateTimeOffset.UtcNow.ToUnixTimeSeconds() - 11).ToString();
        var signature = ComputeSignature(payload, timestamp, TestSecret);

        WebhookVerifier.VerifySignature(payload, signature, timestamp, TestSecret)
            .Should().BeFalse();
    }

    [Fact]
    public void VerifySignature_WithInvalidTimestamp_ReturnsFalse()
    {
        var payload = ParseJson("""{"id":"pay-1","status":"completed"}""");
        var signature = ComputeSignature(payload, CurrentTimestamp(), TestSecret);

        WebhookVerifier.VerifySignature(payload, signature, "not-a-timestamp", TestSecret)
            .Should().BeFalse();
    }

    [Fact]
    public void VerifySignature_WithNestedObjects_ReturnsTrue()
    {
        var payload = ParseJson("""{"event":"payment.completed","data":{"z":1,"a":{"y":2,"b":3}}}""");
        var timestamp = CurrentTimestamp();
        var signature = ComputeSignature(payload, timestamp, TestSecret);

        WebhookVerifier.VerifySignature(payload, signature, timestamp, TestSecret)
            .Should().BeTrue();
    }

    private static JsonElement ParseJson(string json)
    {
        using var document = JsonDocument.Parse(json);
        return document.RootElement.Clone();
    }

    private static string CurrentTimestamp()
        => DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();

    private static string ComputeSignature(JsonElement payload, string timestamp, string secret)
    {
        object? SortKeys(JsonElement value) => value.ValueKind switch
        {
            JsonValueKind.Array => value.EnumerateArray().Select(SortKeys).ToArray(),
            JsonValueKind.Object => value.EnumerateObject()
                .OrderBy(property => property.Name)
                .ToDictionary(
                    property => property.Name,
                    property => SortKeys(property.Value)),
            JsonValueKind.String => value.GetString(),
            JsonValueKind.Number => value.TryGetInt64(out var integer) ? integer : value.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            _ => value.GetRawText(),
        };

        var canonicalJson = JsonSerializer.Serialize(SortKeys(payload));
        var signedString = $"{timestamp}.{canonicalJson}";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(signedString));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
