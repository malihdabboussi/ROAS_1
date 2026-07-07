import { retryAsync } from "../infra/retry.js";

export async function postJsonWithRetry<T>(params: {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  errorPrefix: string;
}): Promise<T> {
  const res = await retryAsync(
    async () => {
      const resAt11 = await fetch(params.url, {
        method: "POST",
        headers: params.headers,
        body: JSON.stringify(params.body),
      });
      if (!resAt11.ok) {
        const text = await resAt11.text();
        const err = new Error(`${params.errorPrefix}: ${resAt11.status} ${text}`) as Error & {
          status?: number;
        };
        err.status = resAt11.status;
        throw err;
      }
      return resAt11;
    },
    {
      attempts: 3,
      minDelayMs: 300,
      maxDelayMs: 2000,
      jitter: 0.2,
      shouldRetry: (err) => {
        const status = (err as { status?: number }).status;
        return status === 429 || (typeof status === "number" && status >= 500);
      },
    },
  );
  return (await res.json()) as T;
}
