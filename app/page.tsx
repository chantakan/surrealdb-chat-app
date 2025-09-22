// app/page.tsx - Tailwind CSS v4動作確認用
import Chat from '@/components/Chat';

export default function Home() {
  return <Chat />;
}

export const metadata = {
  title: 'SurrealDB リアルタイムチャット',
  description: 'SurrealDBのWebSocket機能を使用したリアルタイムチャットアプリケーション',
};