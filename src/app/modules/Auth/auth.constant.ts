export const USER_ROLE = {
  user: 'user',
  vendor: 'vendor',
  admin: 'admin',
  superAdmin: 'superAdmin',
  operationsAdmin: 'operationsAdmin',
  contentModerator: 'contentModerator',
} as const;

export const USER_STATUS = {
  pending: 'pending',
  active: 'active',
  blocked: 'blocked',
} as const;