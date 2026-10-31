// Historic database models are retained for migration and records. Their former
// endpoints cannot bypass the reviewed URL purchasing flow.
const activeRoutes = [
  /^\/api\/purchases(?:\/[0-9a-f-]+(?:\/(?:cancel|checkout|support))?)?$/i,
  /^\/api\/delivery-profile$/,
  /^\/api\/admin\/purchases(?:\/[0-9a-f-]+)?$/i,
  /^\/api\/admin\/support(?:\/[0-9a-f-]+)?$/i,
  /^\/api\/admin-settings$/,
  /^\/api\/admin\/env-health$/,
  /^\/api\/health$/,
  /^\/api\/webhooks\/(?:purchases|shipping)$/,
];

export function isActiveApiPath(path: string) { return activeRoutes.some(pattern => pattern.test(path)); }
