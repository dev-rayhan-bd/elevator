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
    label: 'Profile Completion',
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
    label: 'Add Services Variety',
    description: 'Create active service listings',
    points: 15,
    icon: '🛠️',
  },
  {
    key: 'PACKAGES_PRICING',
    label: 'Add Packages & Pricing',
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
    label: 'Ads',
    description: 'Launch first ad/promotion',
    points: 5,
    icon: '📢',
  },
];

export const PROFILE_SCORE_NOTIFICATIONS: Record<
  VisibilityTaskKey,
  { title: string; message: string }
> = {
  PROFILE_COMPLETION: {
    title: 'Your Profile Score Increased by 20%!',
    message: 'Great job! You’ve completed your business profile and earned 20% toward your Profile Score.',
  },
  BUSINESS_VERIFICATION: {
    title: 'Your Profile Score Increased by 25%!',
    message: 'Congratulations! Your business has been verified and you’ve earned 25% toward your Profile Score.',
  },
  SERVICES_VARIETY: {
    title: 'Your Profile Score Increased by 15%!',
    message: 'Great job! You’ve added a variety of services and earned 15% toward your Profile Score.',
  },
  PACKAGES_PRICING: {
    title: 'Your Profile Score Increased by 15%!',
    message: 'Excellent! You’ve added packages and pricing and earned 15% toward your Profile Score.',
  },
  ACTIVITY_ENGAGEMENT: {
    title: 'Your Profile Score Increased by 10%!',
    message: 'Great work! Your activity and engagement have earned you 10% toward your Profile Score.',
  },
  QUICK_QUOTES: {
    title: 'Your Profile Score Increased by 10%!',
    message: 'Great job! You’ve completed Quick Quote submissions and earned 10% toward your Profile Score.',
  },
  ADS_PROMOTION: {
    title: 'Your Profile Score Increased by 5%!',
    message: 'Great job! You’ve promoted your service with Ads and earned 5% toward your Profile Score.',
  },
};

export const MAX_VISIBILITY_SCORE = 100;
