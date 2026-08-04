export const reviewCategories = [
  'Factual correction',
  'Required change',
  'Statistical issue',
  'Compliance issue',
  'Clarification',
  'Terminology',
  'Grammar',
  'Formatting',
  'Style preference',
  'General question',
] as const

export const reviewPriorities = ['low', 'medium', 'high', 'critical'] as const

export type ReviewCategory = (typeof reviewCategories)[number]
export type ReviewPriority = (typeof reviewPriorities)[number]
