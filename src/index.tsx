import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import type { Bindings } from './types';

// API ルートをインポート
import auth from './routes/auth';
import healthLogs from './routes/health-logs';
import advices from './routes/advices';
import inquiries from './routes/inquiries';
import admin from './routes/admin';
import announcements from './routes/announcements';
import comments from './routes/comments';
import settings from './routes/settings';
import opinions from './routes/opinions';
import blogs from './routes/blogs';
import tts from './routes/tts';

const app = new Hono<{ Bindings: Bindings }>();

// CORS設定
app.use('/api/*', cors());

// 静的ファイル配信
app.use('/static/*', serveStatic({ root: './public' }));

// API ルート
app.route('/api/auth', auth);
app.route('/api/health-logs', healthLogs);
app.route('/api/advices', advices);
app.route('/api/inquiries', inquiries);
app.route('/api/admin', admin);
app.route('/api/announcements', announcements);
app.route('/api/comments', comments);
app.route('/api/settings', settings);
app.route('/api/opinions', opinions);
app.route('/api/blogs', blogs);
app.route('/api/tts', tts);

// R2から画像を取得するルート（R2未設定の場合は404を返す）
app.get('/api/images/:path{.+}', async (c) => {
  // R2バケットが設定されていない場合は404
  if (!c.env.BUCKET) {
    return c.notFound();
  }
  
  const path = c.req.param('path');
  const object = await c.env.BUCKET.get(path);

  if (!object) {
    return c.notFound();
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
});

// トップページ（HTMLを返す）
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ファディ健康ログ</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <link href="/static/styles.css" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#FF6B9D',
                  secondary: '#4A5568',
                  accent: '#FFA500',
                }
              }
            }
          }
        </script>
    </head>
    <body class="bg-gray-50">
        <div id="root"></div>
        <script src="/static/utils.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `);
});

// マイページ
app.get('/mypage', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>マイページ - ファディ健康ログ</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <link href="/static/styles.css" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#FF6B9D',
                  secondary: '#4A5568',
                  accent: '#FFA500',
                }
              }
            }
          }
        </script>
    </head>
    <body class="bg-gray-50">
        <div id="root"></div>
        <script src="/static/utils.js"></script>
        <script src="/static/mypage.js"></script>
    </body>
    </html>
  `);
});

// 管理画面
app.get('/admin', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>管理画面 - ファディ健康ログ</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <link href="/static/styles.css" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#FF6B9D',
                  secondary: '#4A5568',
                  accent: '#FFA500',
                }
              }
            }
          }
        </script>
    </head>
    <body class="bg-gray-50">
        <div id="root"></div>
        <script src="/static/utils.js"></script>
        <script src="/static/admin.js"></script>
    </body>
    </html>
  `);
});

export default app;
