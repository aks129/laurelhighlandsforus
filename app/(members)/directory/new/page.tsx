import Link from 'next/link'
import { createResource } from '../actions'
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/resources'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function NewResourcePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/directory" className="text-sm text-pine hover:underline">
        &larr; Back to directory
      </Link>
      <h1 className="mt-4 font-display text-3xl text-pine-deep">Add a resource</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Share a provider you trust. It publishes immediately for members to see.
      </p>
      {error && (
        <p className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Please add at least a business name and category (and a valid website if you include one).
        </p>
      )}
      <form
        action={createResource}
        className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6"
      >
        <div className="space-y-1.5">
          <Label htmlFor="business_name">Business / provider name *</Label>
          <Input id="business_name" name="business_name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Category *</Label>
          <select
            id="category"
            name="category"
            required
            aria-label="Category"
            defaultValue=""
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <option value="" disabled>
              Select…
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">What they do</Label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contact_name">Contact name</Label>
            <Input id="contact_name" name="contact_name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" placeholder="example.com" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="area_served">Area served</Label>
          <Input id="area_served" name="area_served" placeholder="Hidden Valley, Seven Springs…" />
        </div>
        <Button type="submit" size="lg" className="w-full">
          Publish to directory
        </Button>
      </form>
    </div>
  )
}
