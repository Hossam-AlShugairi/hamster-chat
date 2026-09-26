export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDateSeparator(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getDateKey(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export interface GroupedMessages {
  dateKey: string;
  dateLabel: string;
  messages: Array<{
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
  }>;
}

export function groupMessagesByDate<T extends { created_at: string }>(messages: T[]): GroupedMessages[] {
  const groups: Map<string, GroupedMessages> = new Map();

  for (const message of messages) {
    const key = getDateKey(message.created_at);
    if (!groups.has(key)) {
      groups.set(key, {
        dateKey: key,
        dateLabel: formatDateSeparator(message.created_at),
        messages: [],
      });
    }
    groups.get(key)!.messages.push(message as unknown as GroupedMessages['messages'][0]);
  }

  return Array.from(groups.values());
}
