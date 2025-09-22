// app/page.tsx - Tailwind CSS v4 for operation check
import Chat from '@/components/Chat';

export default function Home() {
  return <Chat />;
}

export const metadata = {
  title: 'SurrealDB Real-time chat',
  description: 'Real-time chat application using SurrealDB\'s WebSocket feature',
};