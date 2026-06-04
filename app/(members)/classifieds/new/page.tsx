import Link from 'next/link'
import { createClassified } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function NewClassifiedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/classifieds" className="text-sm text-pine hover:underline">
        &larr; Back to the free pile
      </Link>
      <h1 className="mt-4 font-display text-3xl text-pine-deep">Post an item</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Add a few photos and it publishes right away.
      </p>
      {error && (
        <p className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Please add a title (and a non-negative price, or mark it free).
        </p>
      )}
      <form
        action={createClassified}
        className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6"
      >
        <div className="space-y-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" name="title" required placeholder="Queen bed frame" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
          />
        </div>
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="price">Price ($)</Label>
            <Input id="price" name="price" type="number" min={0} step="0.01" placeholder="50" />
          </div>
          <label className="flex items-center gap-2 pb-2.5 text-sm text-muted-foreground">
            <input type="checkbox" name="free" className="size-4 accent-[var(--pine)]" /> It&rsquo;s
            free
          </label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="photos">Photos (up to 4)</Label>
          <input
            id="photos"
            name="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-pine file:px-3 file:py-2 file:text-sm file:text-primary-foreground hover:file:bg-pine-deep"
          />
        </div>
        <Button type="submit" size="lg" className="w-full">
          Post to the free pile
        </Button>
      </form>
    </div>
  )
}
