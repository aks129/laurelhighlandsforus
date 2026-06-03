import { buttonVariants } from '@/components/ui/button'
import { env } from '@/lib/env'

export default function CommunityPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Community Slack</h1>
      <p className="text-muted-foreground">
        Our day-to-day conversations happen in Slack — ask questions, share wins, and coordinate.
      </p>
      {env.slackInviteUrl ? (
        <a
          href={env.slackInviteUrl}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants()}
        >
          Join the Slack
        </a>
      ) : (
        <p className="text-sm text-muted-foreground">The Slack invite link will appear here soon.</p>
      )}
    </div>
  )
}
