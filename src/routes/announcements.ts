import { Hono } from 'hono'
import type { CloudflareBindings } from '../types'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Get published announcements (public)
app.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM announcements 
      WHERE is_published = 1 
      ORDER BY published_at DESC 
      LIMIT 10
    `).all()
    
    return c.json({ success: true, data: results })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Admin: Get all announcements
app.get('/admin/all', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM announcements 
      ORDER BY published_at DESC
    `).all()
    
    return c.json({ success: true, data: results })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Admin: Create announcement
app.post('/admin', async (c) => {
  try {
    const { title, content, image_url, is_published } = await c.req.json()
    
    const { meta } = await c.env.DB.prepare(`
      INSERT INTO announcements (title, content, image_url, is_published)
      VALUES (?, ?, ?, ?)
    `).bind(title, content, image_url || null, is_published ? 1 : 0).run()
    
    return c.json({ success: true, id: meta.last_row_id })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Admin: Update announcement
app.put('/admin/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { title, content, image_url, is_published } = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE announcements 
      SET title = ?, content = ?, image_url = ?, is_published = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(title, content, image_url || null, is_published ? 1 : 0, id).run()
    
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Admin: Delete announcement
app.delete('/admin/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    await c.env.DB.prepare(`
      DELETE FROM announcements WHERE id = ?
    `).bind(id).run()
    
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export default app
