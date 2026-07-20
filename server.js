const express = require('express');
const cors = require('cors');

// 🛠️ แก้ปัญหา WebSocket สำหรับ Node v20 (ใส่ก่อนโหลด Supabase)
const ws = require('ws');
global.WebSocket = ws; 

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// สร้าง Client แบบธรรมดา คลีนๆ วงเล็บไม่ซ้อน
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 1) เพิ่มข้อมูล (Create)[cite: 1]
// ==========================================
app.post('/api/tasks', async (req, res) => {
  const { title, description, priority } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const { data, error } = await supabase
    .from('tasks')
    .insert([{ title, description, priority: priority || 'medium', status: 'todo' }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

// ==========================================
// 2) แสดงข้อมูลทั้งหมด & ค้นหา/กรองข้อมูล (Read + Filter)[cite: 1]
// ==========================================
app.get('/api/tasks', async (req, res) => {
  const { search, priority } = req.query;
  let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  if (priority) {
    query = query.eq('priority', priority);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ==========================================
// 3) ดูรายละเอียดของข้อมูลแต่ละรายการ (Read Detail)[cite: 1]
// ==========================================
app.get('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single();

  if (error) return res.status(404).json({ error: 'Task not found' });
  res.json(data);
});

// ==========================================
// 4) แก้ไขข้อมูล (Update ข้อมูล หรือ ย้ายสเตตัส Kanban)[cite: 1]
// ==========================================
app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, status, priority } = req.body;

  const { data, error } = await supabase
    .from('tasks')
    .update({ title, description, status, priority })
    .eq('id', id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// ==========================================
// 5) ลบข้อมูล (Delete)[cite: 1]
// ==========================================
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('tasks').delete().eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Task deleted successfully' });
});

// ==========================================
// 6) ฟังก์ชันเฉพาะ: สรุปยอดรวม/สถิติสถานะงาน (Summary)[cite: 1]
// ==========================================
app.get('/api/summary', async (req, res) => {
  const { data, error } = await supabase.from('tasks').select('status');
  if (error) return res.status(500).json({ error: error.message });

  const total = data.length;
  const todo = data.filter(t => t.status === 'todo').length;
  const doing = data.filter(t => t.status === 'doing').length;
  const done = data.filter(t => t.status === 'done').length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  res.json({ total, todo, doing, done, completionRate });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));