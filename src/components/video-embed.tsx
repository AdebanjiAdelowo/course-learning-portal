/** Turns a watch URL from an allow-listed host into a privacy-friendly embed URL. */
export function toEmbedUrl(videoUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(videoUrl);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  const idPattern = /^[\w-]{6,20}$/;

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id = url.pathname.startsWith("/embed/") ? url.pathname.split("/")[2] : url.searchParams.get("v");
    return id && idPattern.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return idPattern.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean).pop();
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}

export function VideoEmbed({ url, title }: { url: string; title: string }) {
  const embedUrl = toEmbedUrl(url);
  if (!embedUrl) {
    return (
      <p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline underline-offset-4">
          Watch the video for this lesson
        </a>
      </p>
    );
  }
  return (
    <div className="aspect-video overflow-hidden rounded-xl border border-line bg-sunken">
      <iframe
        src={embedUrl}
        title={`Video: ${title}`}
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        className="size-full"
      />
    </div>
  );
}
