/** Private course files, served through /learn/files/<path> (see src/app/learn/files). */

export const COURSE_FILES_BUCKET = "course-files";
export const COURSE_FILES_PREFIX = "/learn/files/";
/** How long a signed download link stays valid. */
export const SIGNED_URL_SECONDS = 60;

/** Path of an object inside the bucket: plain segments, no traversal, no empty parts. */
export function isSafeObjectPath(path: string): boolean {
  if (path.length === 0 || path.length > 400) return false;
  return path.split("/").every((segment) => /^\w[\w\-.]*$/.test(segment));
}

/** True when a resource address points at a private file, not a public one. */
export function isPrivateFileUrl(url: string): boolean {
  return url.startsWith(COURSE_FILES_PREFIX) && isSafeObjectPath(url.slice(COURSE_FILES_PREFIX.length));
}
