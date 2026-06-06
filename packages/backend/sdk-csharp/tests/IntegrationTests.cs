using FluentAssertions;
using Fluxis;
using Fluxis.Errors;
using Fluxis.Models;
using Fluxis.Resources;
using Xunit;

namespace Fluxis.Tests;

public class IntegrationTests
{
    [SkippableFact]
    public async Task Organization_GetAsync_ReturnsOrganization()
    {
        Skip.IfNot(TestEnvironment.TryGetCredentials(out var apiKey, out var apiSecret));

        using var client = new FluxisClient(new FluxisClientOptions
        {
            ApiKey = apiKey,
            ApiSecret = apiSecret,
        });

        var organization = await client.Organization.GetAsync();

        organization.Id.Should().NotBeNullOrWhiteSpace();
        organization.Name.Should().NotBeNullOrWhiteSpace();
    }

    [SkippableFact]
    public async Task Accounts_ListAsync_ReturnsAccounts()
    {
        Skip.IfNot(TestEnvironment.TryGetCredentials(out var apiKey, out var apiSecret));

        using var client = new FluxisClient(new FluxisClientOptions
        {
            ApiKey = apiKey,
            ApiSecret = apiSecret,
        });

        var accounts = await client.Accounts.ListAsync();
        accounts.Should().NotBeNull();
    }

    [SkippableFact]
    public async Task PointOfSale_ListAsync_ReturnsPaginatedResults()
    {
        Skip.IfNot(TestEnvironment.TryGetCredentials(out var apiKey, out var apiSecret));

        using var client = new FluxisClient(new FluxisClientOptions
        {
            ApiKey = apiKey,
            ApiSecret = apiSecret,
        });

        var result = await client.PointOfSale.ListAsync(new ListPointOfSaleOptions
        {
            Page = 1,
            PageSize = 10,
        });

        result.Page.Should().BeGreaterThanOrEqualTo(1);
        result.Data.Should().NotBeNull();
    }

    [SkippableFact]
    public async Task Transactions_ListAsync_ReturnsPaginatedResults()
    {
        Skip.IfNot(TestEnvironment.TryGetCredentials(out var apiKey, out var apiSecret));

        using var client = new FluxisClient(new FluxisClientOptions
        {
            ApiKey = apiKey,
            ApiSecret = apiSecret,
        });

        var result = await client.Transactions.ListAsync(new ListTransactionsOptions
        {
            Page = 1,
            PageSize = 10,
        });

        result.Page.Should().BeGreaterThanOrEqualTo(1);
        result.Data.Should().NotBeNull();
    }

    [SkippableFact]
    public async Task Naspip_ReadAsync_InvalidToken_ThrowsFluxisException()
    {
        Skip.IfNot(TestEnvironment.TryGetCredentials(out var apiKey, out var apiSecret));

        using var client = new FluxisClient(new FluxisClientOptions
        {
            ApiKey = apiKey,
            ApiSecret = apiSecret,
        });

        var act = () => client.Naspip.ReadAsync("v4.local.invalid-token-for-integration-test");
        await act.Should().ThrowAsync<FluxisException>();
    }

    [SkippableFact]
    public async Task Accounts_CreateAndDeleteAsync_RoundTrip()
    {
        Skip.IfNot(TestEnvironment.TryGetCredentials(out var apiKey, out var apiSecret));

        using var client = new FluxisClient(new FluxisClientOptions
        {
            ApiKey = apiKey,
            ApiSecret = apiSecret,
        });

        var name = $"sdk-csharp-test-{Guid.NewGuid():N}"[..24];
        var created = await client.Accounts.CreateAsync(new CreateAccountRequest { Name = name });
        created.Name.Should().Be(name);
        created.Id.Should().NotBeNullOrWhiteSpace();

        await client.Accounts.DeleteAsync(created.Id);
    }

    [Fact]
    public void Naspip_IsValidTokenFormat_WorksLocally()
    {
        NaspipResource.IsValidTokenFormat("v4.local.placeholder").Should().BeTrue();
        NaspipResource.IsValidTokenFormat("invalid").Should().BeFalse();
    }
}
