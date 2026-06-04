import { AssistantChat } from '@/components/assistant-chat'

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-4xl text-pine-deep">Hosting helper</h1>
        <p className="mt-2 text-muted-foreground">
          An AI assistant tuned for Laurel Highlands rental owners. Ask about pricing, local
          services, seasonal strategy, and Airbnb/VRBO best practices. Double-check anything
          regulatory with your township or the county.
        </p>
      </div>
      <AssistantChat />
    </div>
  )
}
