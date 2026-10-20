using FluentAssertions;
using Fluxis;
using Fluxis.Models;
using Xunit;

namespace Fluxis.Tests;

public class ResourceRoutingTests
{
    private static (FluxisClient Client, RoutingMockHandler Handler) CreateRoutingClient()
    {
        var handler = new RoutingMockHandler();
        var httpClient = new HttpClient(handler);
        var client = new FluxisClient(new FluxisClientOptions
        {
            ApiKey = "fxs.stg.test-key",
            ApiSecret = "test-secret",
        }, httpClient);
        return (client, handler);
    }

    [Fact]
    public async Task AccountsResource_RoutesAllMethods()
    {
        var (client, handler) = CreateRoutingClient();
        using (client)
        {
            await client.Accounts.ListAsync();
            handler.LastApiRequest().Method.Should().Be(HttpMethod.Get);
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/account");

            await client.Accounts.GetAsync("acc-1");
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/account/acc-1");

            await client.Accounts.CreateAsync(new CreateAccountRequest { Name = "Test" });
            handler.LastApiRequest().Method.Should().Be(HttpMethod.Post);

            await client.Accounts.UpdateAsync("acc-1", new UpdateAccountRequest { Name = "Updated" });
            handler.LastApiRequest().Method.Should().Be(HttpMethod.Put);

            await client.Accounts.DeleteAsync("acc-1");
            handler.LastApiRequest().Method.Should().Be(HttpMethod.Delete);

            await client.Accounts.GetSettlementAddressesAsync("acc-1");
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/account/acc-1/settlement-addresses");

            await client.Accounts.SetSettlementAddressAsync("acc-1", new SettlementAddressRequest
            {
                Address = "0x1",
                Network = "polygon",
            });
            handler.LastApiRequest().Method.Should().Be(HttpMethod.Post);
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/account/settlement/acc-1/settlement-addresses");

            await client.Accounts.UpdateSettlementAddressAsync("acc-1", new SettlementAddressRequest
            {
                Address = "0x2",
                Network = "ethereum",
            });
            handler.LastApiRequest().Method.Should().Be(HttpMethod.Put);
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/account/settlement/acc-1/settlement-addresses");

            await client.Accounts.DeleteSettlementAddressAsync("acc-1", "polygon");
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/account/settlement/acc-1/settlement-addresses");
            handler.LastApiRequest().RequestUri!.Query.Should().Contain("network=polygon");
        }
    }

    [Fact]
    public async Task OrganizationResource_RoutesAllMethods()
    {
        var (client, handler) = CreateRoutingClient();
        using (client)
        {
            await client.Organization.GetAsync();
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/organization");

            await client.Organization.SetSettlementAddressAsync(new SettlementAddressRequest
            {
                Address = "0x1",
                Network = "polygon",
            });
            handler.LastApiRequest().Method.Should().Be(HttpMethod.Post);

            await client.Organization.UpdateSettlementAddressAsync(new SettlementAddressRequest
            {
                Address = "0x2",
                Network = "ethereum",
            });
            handler.LastApiRequest().Method.Should().Be(HttpMethod.Put);

            await client.Organization.GetSettlementAddressesAsync();
            handler.LastApiRequest().Method.Should().Be(HttpMethod.Get);

            await client.Organization.DeleteSettlementAddressAsync("polygon");
            handler.LastApiRequest().RequestUri!.Query.Should().Contain("network=polygon");
        }
    }

    [Fact]
    public async Task PointOfSaleResource_RoutesAllMethods()
    {
        var (client, handler) = CreateRoutingClient();
        using (client)
        {
            await client.PointOfSale.ListAsync();
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/pos");
            handler.LastApiRequest().RequestUri!.Query.Should().BeEmpty();

            await client.PointOfSale.ListAsync(new ListPointOfSaleOptions
            {
                Page = 2,
                PageSize = 25,
                AccountId = "acc-1",
            });
            handler.LastApiRequest().RequestUri!.Query.Should().Contain("page=2");
            handler.LastApiRequest().RequestUri!.Query.Should().Contain("page_size=25");
            handler.LastApiRequest().RequestUri!.Query.Should().Contain("accountID=acc-1");

            await client.PointOfSale.GetAsync("pos-1");
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/pos/pos-1");

            await client.PointOfSale.CreateAsync(new CreatePointOfSaleRequest
            {
                Name = "Store",
                ReferenceCurrency = "USD",
                Type = "online_fixed",
            });
            handler.LastApiRequest().Method.Should().Be(HttpMethod.Post);

            await client.PointOfSale.UpdateAsync("pos-1", new UpdatePointOfSaleRequest
            {
                Name = "Updated",
                ReferenceCurrency = "USD",
            });
            handler.LastApiRequest().Method.Should().Be(HttpMethod.Put);

            await client.PointOfSale.DeleteAsync("pos-1");
            handler.LastApiRequest().Method.Should().Be(HttpMethod.Delete);

            await client.PointOfSale.GetPaymentIntentionAsync("pos-1");
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/pos/pos-1/payment-intention");

            await client.PointOfSale.CreatePaymentIntentionAsync("pos-1", new CreatePaymentIntentionRequest
            {
                Amount = 25,
                CoinCode = "USD",
            });
            handler.LastApiRequest().Method.Should().Be(HttpMethod.Post);

            await client.PointOfSale.ClosePaymentIntentionAsync("pos-1");
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/pos/pos-1/payment-intention/close");

            await client.PointOfSale.GetQrAsync("pos-1");
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/pos/pos-1/qr");

            await client.PointOfSale.CreatePaymentRequestAsync("pos-1", new CreatePaymentRequestRequest
            {
                Amount = "10.00",
                UniqueAssetId = "npolygon_t0xabc",
            });
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/pos/pos-1/payment-request");

            await client.PointOfSale.GetPaymentRequestAsync("pos-1", "pr-1");
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/pos/pos-1/payment-request/pr-1");

            await client.PointOfSale.CreatePaymentRequestCheckoutAsync("pos-1", new CreatePaymentRequestCheckoutRequest
            {
                Amount = 49.99,
                CoinCode = "USD",
            });
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/pos/pos-1/payment-request-checkout");
        }
    }

    [Fact]
    public async Task NaspipResource_RoutesAllMethods()
    {
        var (client, handler) = CreateRoutingClient();
        using (client)
        {
            await client.Naspip.CreateAsync(new CreateNaspipRequest
            {
                Payment = new NaspipPaymentData
                {
                    Address = "0x1",
                    Amount = 10,
                    UniqueAssetId = "asset",
                },
            });
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/naspip/create");

            await client.Naspip.ReadAsync("v4.local.test");
            var body = await handler.LastApiRequest().Content!.ReadAsStringAsync();
            body.Should().Contain("v4.local.test");
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/naspip/read");
        }
    }

    [Fact]
    public async Task WebhooksResource_RoutesAllMethods()
    {
        var (client, handler) = CreateRoutingClient();
        using (client)
        {
            await client.Webhooks.CreateAsync("acc-1", new WebhookCreateRequest
            {
                Url = "https://example.com/hook",
                EventType = "payment_request",
            });
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/account/acc-1/webhook");

            await client.Webhooks.ListAsync("acc-1");
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/account/acc-1/webhook/list");

            await client.Webhooks.GetLogsAsync("acc-1", page: 1, pageSize: 20);
            handler.LastApiRequest().RequestUri!.Query.Should().Contain("page=1");
            handler.LastApiRequest().RequestUri!.Query.Should().Contain("page_size=20");

            await client.Webhooks.ActivateAsync("acc-1", "wh-1");
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/account/acc-1/webhook/wh-1/activate");

            await client.Webhooks.DeactivateAsync("acc-1", "wh-1");
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/account/acc-1/webhook/wh-1/deactivate");

            await client.Webhooks.DeleteAsync("acc-1", "wh-1");
            handler.LastApiRequest().Method.Should().Be(HttpMethod.Delete);

            await client.Webhooks.TestAsync("acc-1", "wh-1");
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/account/acc-1/webhook/wh-1/test");

            await client.Webhooks.UpdateUrlAsync("acc-1", "wh-1", new WebhookUpdateUrlRequest
            {
                Url = "https://example.com/hook-v2",
            });
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/account/acc-1/webhook/wh-1/url");
        }
    }

    [Fact]
    public async Task TransactionsResource_RoutesList()
    {
        var (client, handler) = CreateRoutingClient();
        using (client)
        {
            await client.Transactions.ListAsync();
            handler.LastApiRequest().RequestUri!.AbsolutePath.Should().EndWith("/transactions");
            handler.LastApiRequest().RequestUri!.Query.Should().Contain("page=1");
            handler.LastApiRequest().RequestUri!.Query.Should().Contain("page_size=50");

            await client.Transactions.ListAsync(new ListTransactionsOptions
            {
                Page = 2,
                PageSize = 10,
            });
            handler.LastApiRequest().RequestUri!.Query.Should().Contain("page=2");
            handler.LastApiRequest().RequestUri!.Query.Should().Contain("page_size=10");
        }
    }
}
