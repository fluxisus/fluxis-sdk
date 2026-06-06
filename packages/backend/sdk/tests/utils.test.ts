import { describe, expect, it } from 'vitest';
import { toCamelCase, toSnakeCase, keysToCamelCase, keysToSnakeCase } from '../src/utils.js';

describe('toSnakeCase', () => {
  it('converts camelCase to snake_case', () => {
    expect(toSnakeCase('uniqueAssetId')).toBe('unique_asset_id');
    expect(toSnakeCase('apiKey')).toBe('api_key');
    expect(toSnakeCase('id')).toBe('id');
    expect(toSnakeCase('webhookUrl')).toBe('webhook_url');
  });
});

describe('toCamelCase', () => {
  it('converts snake_case to camelCase', () => {
    expect(toCamelCase('unique_asset_id')).toBe('uniqueAssetId');
    expect(toCamelCase('api_key')).toBe('apiKey');
    expect(toCamelCase('id')).toBe('id');
    expect(toCamelCase('webhook_url')).toBe('webhookUrl');
  });
});

describe('keysToSnakeCase', () => {
  it('converts object keys to snake_case', () => {
    const input = {
      uniqueAssetId: 'abc',
      referenceId: 'order-1',
      order: {
        coinCode: 'USD',
        items: [{ unitPrice: '10.00', coinCode: 'USD' }],
      },
    };
    const expected = {
      unique_asset_id: 'abc',
      reference_id: 'order-1',
      order: {
        coin_code: 'USD',
        items: [{ unit_price: '10.00', coin_code: 'USD' }],
      },
    };
    expect(keysToSnakeCase(input)).toEqual(expected);
  });

  it('handles null and primitives', () => {
    expect(keysToSnakeCase(null)).toBeNull();
    expect(keysToSnakeCase(undefined)).toBeUndefined();
    expect(keysToSnakeCase('hello')).toBe('hello');
    expect(keysToSnakeCase(42)).toBe(42);
  });

  it('handles arrays', () => {
    const input = [{ coinCode: 'USD' }, { coinCode: 'BRL' }];
    const expected = [{ coin_code: 'USD' }, { coin_code: 'BRL' }];
    expect(keysToSnakeCase(input)).toEqual(expected);
  });
});

describe('keysToCamelCase', () => {
  it('converts object keys to camelCase', () => {
    const input = {
      unique_asset_id: 'abc',
      reference_id: 'order-1',
      expired_at: '2025-01-01',
    };
    const expected = {
      uniqueAssetId: 'abc',
      referenceId: 'order-1',
      expiredAt: '2025-01-01',
    };
    expect(keysToCamelCase(input)).toEqual(expected);
  });

  it('handles nested objects and arrays', () => {
    const input = {
      payment_request: {
        payment_options: ['asset_1'],
        order_items: [{ unit_price: '5.00' }],
      },
    };
    const expected = {
      paymentRequest: {
        paymentOptions: ['asset_1'],
        orderItems: [{ unitPrice: '5.00' }],
      },
    };
    expect(keysToCamelCase(input)).toEqual(expected);
  });
});
