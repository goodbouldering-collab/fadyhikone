import { Hono } from 'hono'
import type { CloudflareBindings } from '../types'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Admin: Get all settings
app.get('/admin', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM settings 
      ORDER BY setting_key
    `).all()
    
    return c.json({ success: true, data: results })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Admin: Update setting
app.put('/admin/:key', async (c) => {
  try {
    const key = c.req.param('key')
    const { value, description } = await c.req.json()
    
    await c.env.DB.prepare(`
      INSERT INTO settings (setting_key, setting_value, description)
      VALUES (?, ?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET 
        setting_value = excluded.setting_value,
        description = excluded.description,
        updated_at = CURRENT_TIMESTAMP
    `).bind(key, value, description || '').run()
    
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Admin: Delete setting
app.delete('/admin/:key', async (c) => {
  try {
    const key = c.req.param('key')
    
    await c.env.DB.prepare(`
      DELETE FROM settings WHERE setting_key = ?
    `).bind(key).run()
    
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export default app
