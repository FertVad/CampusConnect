import express from 'express'
import dotenv from 'dotenv'
import { logger } from './server/utils/logger'

dotenv.config()
const app = express()
app.use(express.json())

app.post('/test/create-task', async (req, res) => {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY // service key для обхода RLS
    )

    logger.info('🚀 Попытка создать задачу...')

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: 'Первая тестовая задача',
        description: 'Описание тестовой задачи',
        priority: 'medium',
        status: 'new',
        client_id: 1, // Vadim (admin)
        executor_id: 1 // Vadim (admin)
      })
      .select()

    if (error) {
      console.error('❌ Ошибка создания:', error)
      return res.status(400).json({ 
        success: false, 
        error: error.message,
        details: error 
      })
    }

    logger.info('✅ Задача создана:', data)
    res.json({ success: true, data })

  } catch (err) {
    console.error('❌ Исключение:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

app.get('/test/tasks', async (req, res) => {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    const { data, error } = await supabase
      .from('tasks')
      .select('*')

    res.json({ tasks: data, error: error?.message })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(5051, () => {
  logger.info('🔧 Debug server: http://localhost:5051')
  logger.info('📝 POST /test/create-task - создать задачу')
  logger.info('📋 GET /test/tasks - получить задачи')
})
