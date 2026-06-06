namespace Fluxis.Tests;

internal static class TestEnvironment
{
    private static bool _loaded;

    internal static void LoadDotEnv()
    {
        if (_loaded)
        {
            return;
        }

        _loaded = true;

        var root = FindPackageRoot();
        if (root is null)
        {
            return;
        }

        var envPath = Path.Combine(root, ".env");
        if (!File.Exists(envPath))
        {
            return;
        }

        foreach (var line in File.ReadAllLines(envPath))
        {
            var trimmed = line.Trim();
            if (trimmed.Length == 0 || trimmed.StartsWith('#') || !trimmed.Contains('='))
            {
                continue;
            }

            var separator = trimmed.IndexOf('=');
            var key = trimmed[..separator].Trim();
            var value = trimmed[(separator + 1)..].Trim().Trim('"', '\'');

            if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
            {
                Environment.SetEnvironmentVariable(key, value);
            }
        }
    }

    internal static bool TryGetCredentials(out string apiKey, out string apiSecret)
    {
        LoadDotEnv();

        apiKey = Environment.GetEnvironmentVariable("FLUXIS_API_KEY") ?? string.Empty;
        apiSecret = Environment.GetEnvironmentVariable("FLUXIS_API_SECRET") ?? string.Empty;
        return !string.IsNullOrWhiteSpace(apiKey) && !string.IsNullOrWhiteSpace(apiSecret);
    }

    private static string? FindPackageRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "Fluxis.Sdk.csproj")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        return null;
    }
}
