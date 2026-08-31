import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, UserPlus, Users, X } from 'lucide-react'

import { apiRequest } from '#/lib/api-client'

import type { ReviewRoundAssignmentSummary } from '#/types/review-assignments'

export function ReviewRoundAssignmentsPanel({
  documentId,
  reviewRoundId,
  reviewRoundName,
}: {
  documentId: string
  reviewRoundId: string
  reviewRoundName: string
}) {
  const queryClient = useQueryClient()
  const endpoint = `/api/v1/documents/${documentId}/review-rounds/${reviewRoundId}/assignments`
  const assignments = useQuery({
    queryKey: ['review-round-assignments', documentId, reviewRoundId],
    queryFn: () => apiRequest<ReviewRoundAssignmentSummary>(endpoint),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  })
  const assign = useMutation({
    mutationFn: (reviewerId: string) =>
      apiRequest(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerId }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['review-round-assignments', documentId, reviewRoundId],
      }),
  })
  const revoke = useMutation({
    mutationFn: (assignmentId: string) =>
      apiRequest(`${endpoint}/${assignmentId}`, { method: 'DELETE' }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['review-round-assignments', documentId, reviewRoundId],
      }),
  })
  const actionError = assign.error ?? revoke.error

  return (
    <section className="mb-5 rounded-xl border border-[#dedbd3] bg-white px-4 py-4 shadow-sm sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#4c6d62]">
            <Users aria-hidden="true" size={14} /> Round assignments
          </p>
          <h2 className="mt-1 text-sm font-bold text-[#26312d]">{reviewRoundName}</h2>
        </div>
        <a
          className="text-xs font-bold text-[#934530] underline-offset-4 hover:underline"
          href="/app/reviewers"
        >
          Invite another reviewer
        </a>
      </div>

      {assignments.isPending ? (
        <output className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#68726d]">
          <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> Loading
          assignments…
        </output>
      ) : assignments.error || !assignments.data ? (
        <p className="mt-4 text-sm text-[#934530]" role="alert">
          {assignments.error?.message ?? 'Assignments could not be loaded.'}
        </p>
      ) : (
        <ul className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {assignments.data.members.map((organizationMember) => {
            const activeMutationId = assign.variables ?? revoke.variables
            const isChanging =
              (assign.isPending && activeMutationId === organizationMember.userId) ||
              (revoke.isPending && activeMutationId === organizationMember.assignment?.id)
            return (
              <li
                className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[#e6e3db] bg-[#faf9f5] px-3 py-2.5"
                key={organizationMember.memberId}
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#28332f]">
                    {organizationMember.name}
                  </p>
                  <p className="truncate text-[11px] text-[#727a76]">
                    {organizationMember.assignment ? 'Assigned' : organizationMember.role}
                  </p>
                </div>
                {organizationMember.assignment ? (
                  <button
                    aria-label={`Remove ${organizationMember.name} from ${reviewRoundName}`}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#d9c8c1] bg-white px-2.5 text-[11px] font-bold text-[#854632] disabled:opacity-55"
                    disabled={assign.isPending || revoke.isPending}
                    onClick={() => revoke.mutate(organizationMember.assignment!.id)}
                    type="button"
                  >
                    {isChanging ? (
                      <LoaderCircle aria-hidden="true" className="animate-spin" size={13} />
                    ) : (
                      <X aria-hidden="true" size={13} />
                    )}
                    Remove
                  </button>
                ) : (
                  <button
                    aria-label={`Assign ${organizationMember.name} to ${reviewRoundName}`}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#315a4e] px-2.5 text-[11px] font-bold text-white disabled:opacity-55"
                    disabled={assign.isPending || revoke.isPending}
                    onClick={() => assign.mutate(organizationMember.userId)}
                    type="button"
                  >
                    {isChanging ? (
                      <LoaderCircle aria-hidden="true" className="animate-spin" size={13} />
                    ) : (
                      <UserPlus aria-hidden="true" size={13} />
                    )}
                    Assign
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {actionError ? (
        <p className="mt-3 text-sm text-[#934530]" role="alert">
          {actionError.message}
        </p>
      ) : null}
    </section>
  )
}
