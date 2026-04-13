// Expo Push API helper.
// Docs: https://docs.expo.dev/push-notifications/sending-notifications/

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

export interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: Record<string, unknown>;
}

export async function sendExpoPush(
  messages: ExpoPushMessage[],
): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return [];

  // Expo accepts up to 100 messages per call.
  const batches: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    batches.push(messages.slice(i, i + 100));
  }

  const tickets: ExpoPushTicket[] = [];
  for (const batch of batches) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Expo push failed ${res.status}: ${text}`);
    }

    const json = await res.json() as { data?: ExpoPushTicket[] };
    tickets.push(...(json.data ?? []));
  }

  return tickets;
}
