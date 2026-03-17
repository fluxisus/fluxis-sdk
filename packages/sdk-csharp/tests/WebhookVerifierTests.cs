using System.Security.Cryptography;
using System.Text;
using FluentAssertions;
using Fluxis.Utilities;
using Xunit;

namespace Fluxis.Tests;

public class WebhookVerifierTests
{
    private const string TestSecret = "whsec_test_secret_12345";
    private const string TestPayload = "{\"event\":\"payment.completed\",\"data\":{\"id\":\"pr_123\"}}";

    [Fact]
    public void VerifySignature_WithValidSignature_ReturnsTrue()
    {
        var signature = ComputeHmac(TestPayload, TestSecret);

        WebhookVerifier.VerifySignature(TestPayload, signature, TestSecret)
            .Should().BeTrue();
    }

    [Fact]
    public void VerifySignature_WithInvalidSignature_ReturnsFalse()
    {
        WebhookVerifier.VerifySignature(TestPayload, "invalid_signature", TestSecret)
            .Should().BeFalse();
    }

    [Fact]
    public void VerifySignature_WithWrongSecret_ReturnsFalse()
    {
        var signature = ComputeHmac(TestPayload, TestSecret);

        WebhookVerifier.VerifySignature(TestPayload, signature, "wrong_secret")
            .Should().BeFalse();
    }

    [Fact]
    public void VerifySignature_WithTamperedPayload_ReturnsFalse()
    {
        var signature = ComputeHmac(TestPayload, TestSecret);

        WebhookVerifier.VerifySignature(TestPayload + "tampered", signature, TestSecret)
            .Should().BeFalse();
    }

    private static string ComputeHmac(string payload, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
