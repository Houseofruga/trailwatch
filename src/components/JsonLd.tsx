/**
 * Renders a JSON-LD structured-data block. Server-only; the data is our own
 * (no user input), so serializing it into a script tag is safe here.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
