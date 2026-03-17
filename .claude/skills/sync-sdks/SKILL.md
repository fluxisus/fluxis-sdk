---
name: sync-sdks
description: "Synchronize all SDK implementations after an OpenAPI/Swagger spec update. Use when: the swagger.yaml has been updated with new endpoints, modified schemas, renamed fields, or removed operations. Reads the spec diff, identifies what changed, and propagates updates to every SDK (TypeScript, C#, Python, Go), their tests, README files, and llms-full.txt documentation."
disable-model-invocation: true
argument-hint: "[path-to-spec (default: spec/swagger.yaml)]"
---

# Sync SDKs — Post-Spec Update Propagation

You are updating the Fluxis SDK monorepo after the OpenAPI spec (`spec/swagger.yaml`) has changed.
Your job is to propagate spec changes to **every SDK that exists in packages/**, plus documentation.

## Step 0: Understand What Changed

1. Read `spec/swagger.yaml` (or the path passed as `$ARGUMENTS` if provided)
2. Run `git diff main -- spec/swagger.yaml` to see what changed (new endpoints, modified schemas, removed fields)
3. If there's no diff, run `git diff HEAD~1 -- spec/swagger.yaml` instead
4. Categorize changes into:
   - **New endpoints** (new paths)
   - **Modified endpoints** (changed parameters, request/response bodies)
   - **New/modified schemas** (new definitions, added/removed/renamed fields)
   - **Removed endpoints or fields** (deprecations)
   - **Enum changes** (new values in status fields, transaction types, etc.)

Present a summary to the user before proceeding. Wait for confirmation.

## Step 1: Identify Active SDKs

Check which SDK directories exist and have source code:

| SDK | Directory | Exists? |
|-----|-----------|---------|
| TypeScript | `packages/sdk/src/` | Check |
| C# | `packages/sdk-csharp/src/` | Check |
| Python | `packages/sdk-python/src/` | Check |
| Go | `packages/sdk-go/` | Check |

Only update SDKs that have implemented source code (not stubs).

## Step 2: Update Each SDK

For each active SDK, apply changes following these language-specific patterns:

---

### TypeScript SDK (`packages/sdk/`)

**Reference files to read first:**
- `packages/sdk/CLAUDE.md` — naming conventions, design rules
- `packages/sdk/src/client.ts` — how resources are registered
- `packages/sdk/src/index.ts` — what's exported

**Naming**: camelCase for properties and methods. The SDK auto-converts to/from snake_case via `utils.ts`.

**For new endpoints:**
1. Add method to existing resource in `src/resources/{resource}.ts`, or create new resource file
2. Add types in `src/types/{resource}.ts`
3. If new resource file: register in `src/client.ts` and export from `src/index.ts`

**For modified schemas:**
1. Update type definitions in `src/types/{resource}.ts`
2. If fields were renamed: update the type AND check if `utils.ts` needs a special override

**For new enums/statuses:**
1. Update union types in `src/types/common.ts`

**Method signature pattern:**
```typescript
async methodName(parentId: string, data: RequestType): Promise<ResponseType> {
  return this.client.request<ResponseType>('POST', `/path/${parentId}/sub`, data);
}
```

---

### C# SDK (`packages/sdk-csharp/`)

**Reference files to read first:**
- `packages/sdk-csharp/CLAUDE.md` — naming conventions, design rules
- `packages/sdk-csharp/src/Fluxis/FluxisClient.cs` — how resources are registered

**Naming**: PascalCase for everything. Every property needs explicit `[JsonPropertyName("snake_case")]`.

**For new endpoints:**
1. Add async method to `src/Fluxis/Resources/{Resource}Resource.cs`
2. Add request/response classes in `src/Fluxis/Models/{Model}.cs`
3. If new resource: create class, register in `FluxisClient.cs`

**For modified schemas:**
1. Update model classes in `src/Fluxis/Models/`
2. Every property MUST have `[JsonPropertyName("api_field_name")]`

**For new enums/statuses:**
1. Add `public const string` to static classes in `Models/Common.cs`

**Method signature pattern:**
```csharp
/// <summary>XML doc here</summary>
public async Task<ResponseType> MethodNameAsync(string parentId, RequestType request, CancellationToken cancellationToken = default)
{
    return await _client.RequestAsync<ResponseType>(HttpMethod.Post, $"/path/{parentId}/sub", request, cancellationToken: cancellationToken);
}
```

**Critical C# rules:**
- ALL async methods must accept `CancellationToken cancellationToken = default`
- ALL async methods must be suffixed with `Async`
- ALL public members must have XML doc comments (`/// <summary>`)
- Use `sealed class` for DTOs
- Nullable reference types: optional fields are `string?`, required are `string`

---

### Python SDK (`packages/sdk-python/`)

**Reference files to read first:**
- `packages/sdk-python/CLAUDE.md` — naming conventions
- `packages/sdk-python/src/fluxis/client.py` — how resources work

**Naming**: snake_case everywhere. Matches API natively — NO case conversion needed.

**For new endpoints:**
1. Add method to `src/fluxis/resources/{resource}.py`
2. Add dataclass models in `src/fluxis/models/{resource}.py`
3. If new resource: register in `client.py` and export from `__init__.py`

**Method signature pattern:**
```python
async def method_name(self, parent_id: str, request: RequestType) -> ResponseType:
    return await self._client.request("POST", f"/path/{parent_id}/sub", body=request)
```

---

### Go SDK (`packages/sdk-go/`)

**Reference files to read first:**
- `packages/sdk-go/CLAUDE.md` — naming conventions
- `packages/sdk-go/fluxis/client.go` — how requests work

**Naming**: PascalCase exported, with `json:"snake_case"` struct tags.

**For new endpoints:**
1. Add method to `fluxis/{resource}.go`
2. Add structs to `fluxis/models.go` with json tags
3. If new resource: create file, register in `client.go`

**Method signature pattern:**
```go
func (c *Client) MethodName(ctx context.Context, parentID string, req *RequestType) (*ResponseType, error) {
    var resp ResponseType
    err := c.request(ctx, http.MethodPost, fmt.Sprintf("/path/%s/sub", parentID), req, &resp)
    return &resp, err
}
```

---

## Step 3: Update Tests

For each SDK that was modified:

1. **TypeScript**: Add/update tests in `packages/sdk/tests/`
2. **C#**: Add/update tests in `packages/sdk-csharp/tests/`
3. **Python**: Add/update tests in `packages/sdk-python/tests/`
4. **Go**: Add/update tests in `packages/sdk-go/fluxis/*_test.go`

Test patterns should follow existing test files in each SDK.

## Step 4: Update Documentation

### Per-SDK docs (for each active SDK):

1. **README.md** — Update method reference tables, add examples for new endpoints
2. **llms-full.txt** — Update method reference tables, add code examples matching the SDK's style

### Root docs:

3. **CLAUDE.md** — Update the API endpoints table and Key Schemas section if new schemas were added
4. **llms.txt** — Update if new common concepts were added (new statuses, new auth flows, etc.)

## Step 5: Verify

Run build and tests for each updated SDK:

```bash
# TypeScript
cd packages/sdk && npm run build && npm test

# C#
cd packages/sdk-csharp && dotnet build && dotnet test tests/Fluxis.Sdk.Tests.csproj

# Python (if active)
cd packages/sdk-python && pip install -e ".[dev]" -q && pytest

# Go (if active)
cd packages/sdk-go && go vet ./... && go build ./... && go test ./...
```

Fix any compilation or test errors before finishing.

## Step 6: Summary

Present a summary of all changes:
- Files modified per SDK
- New methods/types added
- Fields modified or removed
- Tests added or updated
- Documentation updated
- Build/test results

## Important Rules

- **Never auto-generate** — write idiomatic code for each language following existing patterns
- **Never add dependencies** — each SDK uses only its standard/existing libraries
- **Always read existing code first** — match the style exactly
- **snake_case in API, idiomatic in SDK** — each language converts differently
- **Every C# property needs `[JsonPropertyName]`** — never rely on naming policies
- **Every C# async method needs `CancellationToken`** — no exceptions
- **Run builds after changes** — don't leave broken code
