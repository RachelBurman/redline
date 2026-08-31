import { createFileRoute } from '@tanstack/react-router'

import { ReviewerManagementPage } from '#/features/reviewers/reviewer-management-page'

export const Route = createFileRoute('/app/reviewers')({ component: ReviewerManagementPage })
