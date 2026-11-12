import { describe, expect, it } from 'vitest';
import { customerAccountHref, customerReturnPath } from '../customer-redirect';

describe('customer account return paths', () => {
  it.each(['/', '/purchase', '/purchase?url=https%3A%2F%2Fwww.yes24.com%2Fproduct%2Fgoods%2F1', '/orders', '/orders/29edbb35-78f8-4e14-aa19-ecda4d19ae6c', '/settings/delivery', '/admin/purchases', '/admin/support?status=open'])('keeps recognized local routes: %s', path => {
    expect(customerReturnPath(path)).toBe(path);
  });
  it.each([null, '', 'https://outside.example/orders', '//outside.example/orders', '/\\outside.example', '/orders\\outside.example', '/orders\r\nLocation:https://outside.example', '/orders\u0000', '/orders\t', '/orders/%0aoutside', '/orders/%5coutside', '/orders/%2foutside', '/orders/../login', '/orders/../admin/purchases', '/%2foutside.example', '/login', '/signup', '/api/purchases', '/orders-elsewhere', '/unknown'])('rejects an unrecognized or ambiguous redirect: %s', path => {
    expect(customerReturnPath(path)).toBe('/orders');
    expect(customerReturnPath(path, '/')).toBe('/');
  });
  it('bounds the path and preserves a safe return path between account screens', () => {
    expect(customerReturnPath(`/orders?value=${'a'.repeat(2048)}`)).toBe('/orders');
    expect(customerAccountHref('signup', '/settings/delivery')).toBe('/signup?next=%2Fsettings%2Fdelivery');
    expect(customerAccountHref('login', '//outside.example')).toBe('/login?next=%2Forders');
  });
});
