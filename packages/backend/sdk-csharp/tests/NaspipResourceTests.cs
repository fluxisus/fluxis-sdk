using FluentAssertions;
using Fluxis.Resources;
using Xunit;

namespace Fluxis.Tests;

public class NaspipResourceTests
{
    [Theory]
    [InlineData("v4.local.abc123", true)]
    [InlineData("v4.local.", true)]
    [InlineData("v4.local.Gx1TZT3STnhzZ-0o-abc123", true)]
    [InlineData("v4.public.abc123", false)]
    [InlineData("v3.local.abc123", false)]
    [InlineData("random-string", false)]
    [InlineData("", false)]
    public void IsValidTokenFormat_ReturnsExpectedResult(string token, bool expected)
    {
        NaspipResource.IsValidTokenFormat(token).Should().Be(expected);
    }
}
