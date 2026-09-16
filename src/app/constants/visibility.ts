// ──────────────────────────────────────────────────────────
//  Centralized Visibility Score Configuration
//  Total must never exceed 100
// ──────────────────────────────────────────────────────────

export const VISIBILITY_POINTS = {
  PROFILE_COMPLETION: 20,    // Complete basic profile setup during registration
  BUSINESS_VERIFICATION: 25, // Get a verified badge
  SERVICES_VARIETY: 15,      // Create active service listings
  PACKAGES_PRICING: 15,      // Set up detailed service packages
  ACTIVITY_ENGAGEMENT: 10,   // Login frequency, response time, portfolio updates
  QUICK_QUOTES: 10,          // Respond quickly to customer requests
  ADS_PROMOTION: 5,          // Launch first ad/promotion
} as const;

export type VisibilityTaskKey = keyof typeof VISIBILITY_POINTS;

export interface IVisibilityTask {
  key: VisibilityTaskKey;
  label: string;
  description: string;
  points: number;
  icon: string;
}

export const VISIBILITY_TASKS: IVisibilityTask[] = [
  {
    key: 'PROFILE_COMPLETION',
    label: 'Profile Setup & Registration',
    description: 'Complete basic profile setup during registration',
    points: 20,
    icon: '📝',
  },
  {
    key: 'BUSINESS_VERIFICATION',
    label: 'Business Verification',
    description: 'Get a verified badge',
    points: 25,
    icon: '🛡️',
  },
  {
    key: 'SERVICES_VARIETY',
    label: 'Services Variety',
    description: 'Create active service listings',
    points: 15,
    icon: '🛠️',
  },
  {
    key: 'PACKAGES_PRICING',
    label: 'Packages & Pricing',
    description: 'Set up detailed service packages',
    points: 15,
    icon: '📦',
  },
  {
    key: 'ACTIVITY_ENGAGEMENT',
    label: 'Activity & Engagement',
    description: 'Login frequency, response time, portfolio updates',
    points: 10,
    icon: '⚡',
  },
  {
    key: 'QUICK_QUOTES',
    label: 'Quick Quote Submissions',
    description: 'Respond quickly to customer requests',
    points: 10,
    icon: '💬',
  },
  {
    key: 'ADS_PROMOTION',
    label: 'Get More Leads with Ads',
    description: 'Launch first ad/promotion',
    points: 5,
    icon: '📢',
  },
];

export const MAX_VISIBILITY_SCORE = 100;
