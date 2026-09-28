// server/src/constants/subscriptionPlans.ts

export const SUBSCRIPTION_PLANS = {
    STARTER: {
        plan_name: 'STARTER',
        max_branches: 1,
        max_employees: 5,
        valid_months: 12,
    },
    PROFESSIONAL: {
        plan_name: 'PROFESSIONAL',
        max_branches: 3,
        max_employees: 15,
        valid_months: 12,
    },
    ENTERPRISE: {
        plan_name: 'ENTERPRISE',
        max_branches: 10, // Or whatever upper limit makes sense
        max_employees: 50,
        valid_months: 12,
    }
} as const;

// This creates a strict TypeScript type ('STARTER' | 'PROFESSIONAL' | 'ENTERPRISE')
export type PlanType = keyof typeof SUBSCRIPTION_PLANS;