import { MessagesSquare } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { env } from '@/lib/env'

export default function CommunityPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl border border-border bg-card p-8 sm:p-10">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-pine/10 text-pine">
          <MessagesSquare className="size-6" />
        </span>
        <h1 className="mt-5 font-display text-3xl text-pine-deep">Community Slack</h1>
        <p className="mt-3 text-muted-foreground">
          Our day-to-day conversation lives in Slack &mdash; ask quick questions, share wins, swap
          referrals, and coordinate with fellow owners. It&rsquo;s the easiest way to stay connected
          between our monthly calls.
        </p>
        <div className="mt-7">
          {env.slackInviteUrl ? (
            <a
              href={env.slackInviteUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ size: 'lg' })}
            >
              Join the Slack
            </a>
          ) : (
            <p className="rounded-xl border border-dashed border-amber/50 bg-amber/5 px-4 py-3 text-sm text-muted-foreground">
              The Slack invite link will appear here soon &mdash; check back shortly.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
