import { Hono } from 'hono'
import type { Bindings } from '../types'
import { verifyToken, extractToken } from '../utils/jwt'

const app = new Hono<{ Bindings: Bindings }>()

// Get user's own opinions (requires authentication)
app.get('/user/:userId', async (c) => {
  try {
    const token = extractToken(c.req.header('Authorization'))
    if (!token) {
      return c.json({ success: false, error: '認証が必要です' }, 401)
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return c.json({ success: false, error: 'トークンが無効です' }, 401)
    }
    
    const userId = c.req.param('userId')
    
    // Users can only view their own opinions
    if (parseInt(userId) !== payload.userId) {
      return c.json({ success: false, error: 'Unauthorized' }, 403)
    }
    
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM opinion_box
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all()
    
    return c.json({ success: true, data: results })
  } catch (error) {
    console.error('Error fetching user opinions:', error)
    return c.json({ success: false, error: 'Failed to fetch opinions' }, 500)
  }
})

// Create new opinion (requires authentication)
app.post('/', async (c) => {
  try {
    const token = extractToken(c.req.header('Authorization'))
    if (!token) {
      return c.json({ success: false, error: '認証が必要です' }, 401)
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return c.json({ success: false, error: 'トークンが無効です' }, 401)
    }
    
    const userId = payload.userId
    const { question } = await c.req.json()
    
    if (!question || question.trim().length === 0) {
      return c.json({ success: false, error: 'Question is required' }, 400)
    }
    
    const { meta } = await c.env.DB.prepare(`
      INSERT INTO opinion_box (user_id, question, status)
      VALUES (?, ?, 'pending')
    `).bind(userId, question.trim()).run()
    
    return c.json({ 
      success: true, 
      id: meta.last_row_id,
      message: 'Opinion submitted successfully' 
    })
  } catch (error) {
    console.error('Error creating opinion:', error)
    return c.json({ success: false, error: 'Failed to create opinion' }, 500)
  }
})

// Get all opinions (admin only)
app.get('/admin', async (c) => {
  try {
    const token = extractToken(c.req.header('Authorization'))
    if (!token) {
      return c.json({ success: false, error: '認証が必要です' }, 401)
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return c.json({ success: false, error: '管理者権限が必要です' }, 403)
    }
    
    const { results } = await c.env.DB.prepare(`
      SELECT 
        o.*,
        u.name as user_name,
        u.email as user_email
      FROM opinion_box o
      JOIN users u ON o.user_id = u.id
      ORDER BY 
        CASE WHEN o.status = 'pending' THEN 0 ELSE 1 END,
        o.created_at DESC
    `).all()
    
    return c.json({ success: true, data: results })
  } catch (error) {
    console.error('Error fetching admin opinions:', error)
    return c.json({ success: false, error: 'Failed to fetch opinions' }, 500)
  }
})

// Get unprocessed count (admin only)
app.get('/admin/unprocessed-count', async (c) => {
  try {
    const token = extractToken(c.req.header('Authorization'))
    if (!token) {
      return c.json({ success: false, error: '認証が必要です' }, 401)
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return c.json({ success: false, error: '管理者権限が必要です' }, 403)
    }
    
    const result = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM opinion_box
      WHERE status = 'pending'
    `).first()
    
    return c.json({ 
      success: true, 
      count: result?.count || 0 
    })
  } catch (error) {
    console.error('Error fetching unprocessed count:', error)
    return c.json({ success: false, error: 'Failed to fetch count' }, 500)
  }
})

// Answer opinion (admin only)
app.put('/:id/answer', async (c) => {
  try {
    const token = extractToken(c.req.header('Authorization'))
    if (!token) {
      return c.json({ success: false, error: '認証が必要です' }, 401)
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return c.json({ success: false, error: '管理者権限が必要です' }, 403)
    }
    
    const opinionId = c.req.param('id')
    const { answer, answered_by } = await c.req.json()
    
    if (!answer || answer.trim().length === 0) {
      return c.json({ success: false, error: 'Answer is required' }, 400)
    }
    
    if (!answered_by || answered_by.trim().length === 0) {
      return c.json({ success: false, error: 'Answered by is required' }, 400)
    }
    
    await c.env.DB.prepare(`
      UPDATE opinion_box
      SET answer = ?, status = 'answered', answered_at = CURRENT_TIMESTAMP, answered_by = ?
      WHERE id = ?
    `).bind(answer.trim(), answered_by.trim(), opinionId).run()
    
    return c.json({ 
      success: true, 
      message: 'Opinion answered successfully' 
    })
  } catch (error) {
    console.error('Error answering opinion:', error)
    return c.json({ success: false, error: 'Failed to answer opinion' }, 500)
  }
})

// Delete opinion (admin only)
app.delete('/:id', async (c) => {
  try {
    const token = extractToken(c.req.header('Authorization'))
    if (!token) {
      return c.json({ success: false, error: '認証が必要です' }, 401)
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return c.json({ success: false, error: '管理者権限が必要です' }, 403)
    }
    
    const opinionId = c.req.param('id')
    
    await c.env.DB.prepare(`
      DELETE FROM opinion_box WHERE id = ?
    `).bind(opinionId).run()
    
    return c.json({ 
      success: true, 
      message: 'Opinion deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting opinion:', error)
    return c.json({ success: false, error: 'Failed to delete opinion' }, 500)
  }
})

export default app
