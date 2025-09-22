import { Surreal, RecordId } from 'surrealdb';

export interface ChatMessage {
  id?: RecordId<string> | string;
  username: string;
  message: string;
  timestamp: Date;
  [key: string]: any; // SurrealDBの型制約を満たすためのindex signature
}

class SurrealDBService {
  private db: Surreal;
  private connected: boolean = false;

  constructor() {
    this.db = new Surreal();
  }

  async connect() {
    const connectionConfigs = [
      { url: 'ws://localhost:8000/rpc', type: 'WebSocket' },
      { url: 'http://localhost:8000/rpc', type: 'HTTP' },
      { url: 'ws://127.0.0.1:8000/rpc', type: 'WebSocket' },
      { url: 'http://127.0.0.1:8000/rpc', type: 'HTTP' },
      // 基本的なWebSocketエンドポイントも試行
      { url: 'ws://localhost:8000', type: 'WebSocket-Basic' },
      { url: 'http://localhost:8000', type: 'HTTP-Basic' },
    ];

    const errors: string[] = [];

    for (const config of connectionConfigs) {
      try {
        console.log(`🔄 Trying ${config.type} connection to ${config.url}...`);
        
        // SurrealDBインスタンスを新しく作成（前の試行の影響を避けるため）
        this.db = new Surreal();
        
        // 接続を試行
        await this.db.connect(config.url);
        console.log(`✅ ${config.type} connection established to ${config.url}`);
        
        // 最初に認証を試行（一部のバージョンではこちらが先）
        console.log('🔐 Signing in...');
        await this.db.signin({
          username: 'root',
          password: 'root'
        });
        console.log('✅ Authentication successful');
        
        // データベース選択
        console.log('🎯 Selecting namespace and database...');
        await this.db.use({
          namespace: 'chat',
          database: 'realtime'
        });
        console.log('✅ Database selected');

        this.connected = true;
        console.log(`🎉 SurrealDB connected successfully via ${config.type} to ${config.url}`);

        // 簡単な動作テスト
        console.log('🧪 Testing basic query...');
        await this.db.query('INFO DB');
        console.log('✅ Basic query test passed');

        // チャットメッセージテーブルの初期化
        await this.initializeSchema();
        return; // 接続成功したら終了
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ ${config.type} connection failed to ${config.url}:`, errorMessage);
        
        // 詳細なエラー情報をログ出力
        if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error stack:', error.stack?.substring(0, 200) + '...');
        }
        
        errors.push(`${config.url} (${config.type}): ${errorMessage}`);
        
        // 接続を閉じる（次の試行のため）
        try {
          await this.db.close();
        } catch (closeError) {
          // 接続が確立されていない場合のエラーは無視
        }
        
        continue;
      }
    }

    // すべての接続方法で失敗した場合
    console.error('🚨 All connection attempts failed');
    console.error('Detailed errors:', errors);
    console.error('🔍 Server is running but client connection failed. Possible causes:');
    console.error('1. SurrealDB.js version compatibility issue - try: npm install surrealdb.js@^1.0.0');
    console.error('2. Browser CORS policy blocking connection');
    console.error('3. Authentication protocol changes in newer versions');
    console.error('4. WebSocket/HTTP endpoint configuration mismatch');
    console.error('5. Try different SurrealDB.js version or connection method');
    
    const finalError = new Error(`All connection attempts failed. Server is running, but client connection failed. Check browser console for detailed errors. Last error: ${errors[errors.length - 1] || 'Unknown'}`);
    throw finalError;
  }

  private async initializeSchema() {
    // メッセージテーブルの定義
    await this.db.query(`
      DEFINE TABLE messages SCHEMAFULL;
      DEFINE FIELD username ON messages TYPE string ASSERT $value != NONE;
      DEFINE FIELD message ON messages TYPE string ASSERT $value != NONE;
      DEFINE FIELD timestamp ON messages TYPE datetime DEFAULT time::now();
      DEFINE INDEX messages_timestamp_idx ON messages COLUMNS timestamp;
    `);
  }

  async sendMessage(username: string, message: string): Promise<ChatMessage[]> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.db.create('messages', {
        username,
        message,
        timestamp: new Date()
      });

      return Array.isArray(result) ? result as ChatMessage[] : [result as ChatMessage];
    } catch (error) {
      console.error('Failed to send message:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async getMessages(limit: number = 50): Promise<ChatMessage[]> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.db.select('messages');
      
      if (result && Array.isArray(result)) {
        const messages = result as ChatMessage[];
        return messages
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          .slice(-limit);
      }
      return [];
    } catch (error) {
      console.error('Failed to get messages:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  // リアルタイムメッセージの監視
  async subscribeToMessages(callback: (message: ChatMessage) => void) {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    try {
      // SurrealDBのlive queryを使用してリアルタイム更新を監視
      const queryUuid = await this.db.live('messages', (action, result) => {
        if (action === 'CREATE' && result) {
          callback(result as ChatMessage);
        }
      });

      return queryUuid.toString();
    } catch (error) {
      console.error('Failed to subscribe to messages:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async unsubscribe(queryUuid: string) {
    try {
      // UUIDに変換して渡す
      await this.db.kill(queryUuid as any);
    } catch (error) {
      console.error('Failed to unsubscribe:', error instanceof Error ? error.message : String(error));
    }
  }

  async disconnect() {
    if (this.connected) {
      await this.db.close();
      this.connected = false;
      console.log('SurrealDB disconnected');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// シングルトンインスタンス
export const surrealDB = new SurrealDBService();