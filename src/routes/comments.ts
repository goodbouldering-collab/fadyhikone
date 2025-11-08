import { Hono } from 'hono'
import type { CloudflareBindings } from '../types'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Get user's staff comments
app.get('/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM staff_comments 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).bind(userId).all()
    
    return c.json({ success: true, data: results })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Admin: Get all comments for a user
app.get('/admin/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM staff_comments 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).bind(userId).all()
    
    return c.json({ success: true, data: results })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Admin: Add staff comment
app.post('/admin', async (c) => {
  try {
    const { user_id, staff_name, comment } = await c.req.json()
    
    const { meta } = await c.env.DB.prepare(`
      INSERT INTO staff_comments (user_id, staff_name, comment)
      VALUES (?, ?, ?)
    `).bind(user_id, staff_name, comment).run()
    
    return c.json({ success: true, id: meta.last_row_id })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Admin: Update staff comment
app.put('/admin/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { comment } = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE staff_comments 
      SET comment = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(comment, id).run()
    
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Admin: Delete staff comment
app.delete('/admin/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    await c.env.DB.prepare(`
      DELETE FROM staff_comments WHERE id = ?
    `).bind(id).run()
    
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export default app
