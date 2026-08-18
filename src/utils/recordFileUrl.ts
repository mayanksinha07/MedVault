const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const resolveRecordFileUrl = (
  apiUrl: string | undefined,
  fileUrl: string
) => {
  if (!fileUrl) {
    return "";
  }

  if (isAbsoluteUrl(fileUrl)) {
    return fileUrl;
  }

  const normalizedFileUrl = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;

  if (!apiUrl) {
    return "";
  }

  try {
    const origin = new URL(apiUrl).origin;
    return `${trimTrailingSlash(origin)}${normalizedFileUrl}`;
  } catch {
    return `${trimTrailingSlash(apiUrl)}${normalizedFileUrl}`;
  }
};
