using System.Net;
using System.Text;
using System.Text.Json;

namespace Fluxis.Tests;

internal sealed class RoutingMockHandler : HttpMessageHandler
{
    public List<HttpRequestMessage> Requests { get; } = [];

    /// <inheritdoc />
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        Requests.Add(await CloneRequestAsync(request, cancellationToken));

        var path = request.RequestUri!.AbsolutePath;
        if (path.EndsWith("/auth/token", StringComparison.Ordinal))
        {
            var authJson = """
            {
              "status": "success",
              "data": {
                "token": "v4.local.test-token",
                "expired_at": "2099-01-01T00:00:00.000Z"
              }
            }
            """;
            return JsonResponse(authJson);
        }

        if (request.Method == HttpMethod.Delete)
        {
            return new HttpResponseMessage(HttpStatusCode.NoContent);
        }

        var dataJson = SuccessDataJson(request.Method.Method, path);
        var envelope = $$"""
        {
          "status": "success",
          "data": {{dataJson}}
        }
        """;
        return JsonResponse(envelope);
    }

    public HttpRequestMessage LastApiRequest()
    {
        for (var i = Requests.Count - 1; i >= 0; i--)
        {
            if (!Requests[i].RequestUri!.AbsolutePath.EndsWith("/auth/token", StringComparison.Ordinal))
            {
                return Requests[i];
            }
        }

        throw new InvalidOperationException("No API request recorded.");
    }

    private static string SuccessDataJson(string method, string path)
    {
        if (path.EndsWith("/webhook/list", StringComparison.Ordinal))
        {
            return "[]";
        }

        if (path.EndsWith("/pos", StringComparison.Ordinal) && method == "POST")
        {
            return """{"id":"pos-1","name":"Store"}""";
        }

        if (path.EndsWith("/webhook/logs", StringComparison.Ordinal)
            || path.EndsWith("/pos", StringComparison.Ordinal)
            || path.EndsWith("/transactions", StringComparison.Ordinal))
        {
            return """{"data":[],"page":1,"page_size":50,"total":0,"total_pages":0}""";
        }

        if (path.EndsWith("/account", StringComparison.Ordinal) && method == "GET")
        {
            return """[{"id":"acc-1","name":"Test"}]""";
        }

        if (path.EndsWith("/settlement-addresses", StringComparison.Ordinal) && method == "GET")
        {
            return path.Contains("/account/", StringComparison.Ordinal)
                ? """{"addresses":[]}"""
                : """[{"address":"0x1","network":"polygon"}]""";
        }

        if (path.Contains("/settlement-addresses", StringComparison.Ordinal))
        {
            return """{"address":"0x1","network":"polygon"}""";
        }

        if (path.EndsWith("/organization", StringComparison.Ordinal))
        {
            return """
            {"id":"org-1","name":"Test Org","country":"US","owner_email":"owner@example.com"}
            """;
        }

        if (path.EndsWith("/naspip/create", StringComparison.Ordinal))
        {
            return """{"token":"v4.local.created"}""";
        }

        if (path.Contains("/webhook", StringComparison.Ordinal))
        {
            return """
            {"id":"wh-1","url":"https://example.com/hook","event_type":"payment_request","enabled":true}
            """;
        }

        return """{"id":"resource-1","name":"Test"}""";
    }

    private static async Task<HttpRequestMessage> CloneRequestAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var clone = new HttpRequestMessage(request.Method, request.RequestUri);
        foreach (var header in request.Headers)
        {
            clone.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        if (request.Content is not null)
        {
            var body = await request.Content.ReadAsStringAsync(cancellationToken);
            clone.Content = new StringContent(body, Encoding.UTF8, "application/json");
        }

        return clone;
    }

    private static HttpResponseMessage JsonResponse(string json)
    {
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        };
    }
}
