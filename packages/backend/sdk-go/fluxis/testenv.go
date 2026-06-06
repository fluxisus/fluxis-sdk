package fluxis

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

// LoadTestEnv reads a .env file from the sdk-go package root and sets environment variables.
// Existing environment variables are not overwritten.
func LoadTestEnv() error {
	root, err := findPackageRoot()
	if err != nil {
		return err
	}

	envPath := filepath.Join(root, ".env")
	file, err := os.Open(envPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}

		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		value = strings.Trim(value, `"'`)

		if os.Getenv(key) == "" {
			if err := os.Setenv(key, value); err != nil {
				return err
			}
		}
	}

	return scanner.Err()
}

func findPackageRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", os.ErrNotExist
		}
		dir = parent
	}
}

// TestCredentials returns staging credentials from the environment.
func TestCredentials() (apiKey, apiSecret string, ok bool) {
	apiKey = os.Getenv("FLUXIS_API_KEY")
	apiSecret = os.Getenv("FLUXIS_API_SECRET")
	return apiKey, apiSecret, apiKey != "" && apiSecret != ""
}
