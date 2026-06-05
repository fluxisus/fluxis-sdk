using System.Text.Json;
using FluentAssertions;
using Fluxis.Models;
using Xunit;

namespace Fluxis.Tests;

public class ModelSerializationTests
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    [Fact]
    public void PaymentRequestResponse_DeserializesFromSnakeCase()
    {
        var json = """
        {
            "id": "pr_123",
            "status": "created",
            "token": "v4.local.abc123",
            "reference_id": "order-456",
            "expiration": 1717833600
        }
        """;

        var result = JsonSerializer.Deserialize<PaymentRequestResponse>(json, Options);

        result.Should().NotBeNull();
        result!.Id.Should().Be("pr_123");
        result.Status.Should().Be("created");
        result.Token.Should().Be("v4.local.abc123");
        result.ReferenceId.Should().Be("order-456");
        result.Expiration.Should().Be(1717833600);
    }

    [Fact]
    public void CreatePaymentRequestRequest_SerializesToSnakeCase()
    {
        var request = new CreatePaymentRequestRequest
        {
            Amount = "100.50",
            UniqueAssetId = "npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
            ReferenceId = "order-789",
            Order = new Order
            {
                Total = "100.50",
                CoinCode = "USD",
                Description = "Test order",
                Merchant = new Merchant { Name = "TestShop" },
                Items = new List<OrderItem>
                {
                    new()
                    {
                        Description = "Flight ticket",
                        Quantity = 1,
                        UnitPrice = "100.50",
                        Amount = "100.50",
                        CoinCode = "USD",
                    },
                },
            },
        };

        var json = JsonSerializer.Serialize(request, Options);

        json.Should().Contain("\"unique_asset_id\"");
        json.Should().Contain("\"reference_id\"");
        json.Should().Contain("\"coin_code\"");
        json.Should().Contain("\"unit_price\"");
        json.Should().NotContain("\"UniqueAssetId\"");
    }

    [Fact]
    public void ApiResponse_DeserializesGenericPayload()
    {
        var json = """
        {
            "status": "success",
            "data": {
                "id": "acc_123",
                "name": "Test Account",
                "external_id": "ext_456"
            }
        }
        """;

        var result = JsonSerializer.Deserialize<ApiResponse<Account>>(json, Options);

        result.Should().NotBeNull();
        result!.Status.Should().Be("success");
        result.Data.Should().NotBeNull();
        result.Data!.Id.Should().Be("acc_123");
        result.Data.Name.Should().Be("Test Account");
        result.Data.ExternalId.Should().Be("ext_456");
    }

    [Fact]
    public void ApiErrorResponse_DeserializesErrorPayload()
    {
        var json = """
        {
            "status": "error",
            "code": "AK0001",
            "message": "Invalid credentials",
            "details": "The provided API key is invalid"
        }
        """;

        var result = JsonSerializer.Deserialize<ApiErrorResponse>(json, Options);

        result.Should().NotBeNull();
        result!.Status.Should().Be("error");
        result.Code.Should().Be("AK0001");
        result.Message.Should().Be("Invalid credentials");
        result.Details.Should().Be("The provided API key is invalid");
    }

    [Fact]
    public void TransactionListResponse_DeserializesPaginatedResponse()
    {
        var json = """
        {
            "data": [
                {
                    "id": "tx_001",
                    "type": "deposit",
                    "status": "completed",
                    "gross_amount": 100.5,
                    "net_amount": 99.0
                }
            ],
            "total": 42,
            "limit": 10,
            "offset": 0
        }
        """;

        var result = JsonSerializer.Deserialize<TransactionListResponse>(json, Options);

        result.Should().NotBeNull();
        result!.Data.Should().HaveCount(1);
        result.Data[0].Id.Should().Be("tx_001");
        result.Data[0].Type.Should().Be("deposit");
        result.Data[0].GrossAmount.Should().Be(100.5);
        result.Total.Should().Be(42);
        result.Limit.Should().Be(10);
    }
}
