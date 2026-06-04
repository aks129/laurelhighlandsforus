import Link from 'next/link'

const PHOTOS = [
  {
    file: 'Fall Foliage in Laurel Mountains',
    author: 'Ron Shawley',
    license: 'CC BY 3.0',
    url: 'https://commons.wikimedia.org/wiki/File:Fall_Foliage_in_Laurel_Mountains_-_panoramio.jpg',
  },
  {
    file: 'Laurel Highlands Trail',
    author: 'Ii2nmd (English Wikipedia)',
    license: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Laurel_Highlands_Trail.jpg',
  },
  {
    file: 'Laurel Mountain Summit',
    author: 'Ron Shawley',
    license: 'CC BY 3.0',
    url: 'https://commons.wikimedia.org/wiki/File:Laurel_Mountain_Summit_-_panoramio.jpg',
  },
  {
    file: 'Cucumber Falls, Ohiopyle State Park',
    author: 'Prashant Wakte',
    license: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:Cucumber_Falls.jpg',
  },
  {
    file: 'Mountain Laurel (Kalmia latifolia)',
    author: 'Botteville',
    license: 'Public domain',
    url: 'https://commons.wikimedia.org/wiki/File:Kalmia5.JPG',
  },
]

export default function CreditsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <Link href="/" className="text-sm text-pine hover:underline">
        &larr; Back home
      </Link>
      <h1 className="mt-6 font-display text-4xl text-pine-deep">Photo credits</h1>
      <p className="mt-3 text-muted-foreground">
        The scenery on this site comes from the Laurel Highlands of Pennsylvania, shared by
        photographers on Wikimedia Commons under the licenses below. Thank you to each of them.
      </p>
      <ul className="mt-8 space-y-4">
        {PHOTOS.map((p) => (
          <li key={p.file} className="rounded-xl border border-border bg-card p-4">
            <p className="font-medium">{p.file}</p>
            <p className="text-sm text-muted-foreground">
              by {p.author} &middot; {p.license} &middot;{' '}
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="text-pine underline underline-offset-2"
              >
                source
              </a>
            </p>
          </li>
        ))}
      </ul>
    </main>
  )
}
