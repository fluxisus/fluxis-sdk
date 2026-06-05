using FluentAssertions;
using Fluxis;
using Fluxis.Errors;
using Xunit;

namespace Fluxis.Tests;

public class FluxisClientTests
{
    [Fact]
    public void Constructor_WithValidOptions_CreatesClient()
    {
        var client = new FluxisClient(new FluxisClientOptions
        {
            ApiKey = "fxs.stg.test-key",
            ApiSecret = "test-secret",
        });

        client.Accounts.Should().NotBeNull();
        client.Organization.Should().NotBeNull();
        client.PointOfSale.Should().NotBeNull();
        client.Naspip.Should().NotBeNull();
        client.Refunds.Should().NotBeNull();
        client.Transactions.Should().NotBeNull();

        client.Dispose();
    }

    [Fact]
    public void Constructor_WithoutApiKey_ThrowsArgumentException()
    {
        var act = () => new FluxisClient(new FluxisClientOptions
        {
            ApiKey = "",
            ApiSecret = "test-secret",
        });

        act.Should().Throw<ArgumentException>()
            .WithParameterName("options");
    }

    [Fact]
    public void Constructor_WithoutApiSecret_ThrowsArgumentException()
    {
        var act = () => new FluxisClient(new FluxisClientOptions
        {
            ApiKey = "fxs.stg.test-key",
            ApiSecret = "",
        });

        act.Should().Throw<ArgumentException>()
            .WithParameterName("options");
    }

    [Fact]
    public void Constructor_WithProductionApiKey_CreatesClient()
    {
        var client = new FluxisClient(new FluxisClientOptions
        {
            ApiKey = "fxs.prd.test-key",
            ApiSecret = "test-secret",
        });

        client.Should().NotBeNull();
        client.Dispose();
    }

    [Fact]
    public void Constructor_WithInvalidApiKeyPrefix_ThrowsArgumentException()
    {
        var act = () => new FluxisClient(new FluxisClientOptions
        {
            ApiKey = "invalid-key",
            ApiSecret = "test-secret",
        });

        act.Should().Throw<ArgumentException>()
            .WithMessage("ApiKey must start with \"fxs.stg.\" or \"fxs.prd.\".*")
            .WithParameterName("apiKey");
    }

    [Fact]
    public void Constructor_WithExternalHttpClient_DoesNotDisposeIt()
    {
        var httpClient = new HttpClient();

        var client = new FluxisClient(new FluxisClientOptions
        {
            ApiKey = "fxs.stg.test-key",
            ApiSecret = "test-secret",
        }, httpClient);

        client.Dispose();

        // HttpClient should still be usable after FluxisClient disposal
        // (no ObjectDisposedException)
        httpClient.BaseAddress.Should().BeNull();
        httpClient.Dispose();
    }
}
