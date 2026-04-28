require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding database...');

    // Demo users
    const passwordHash = await bcrypt.hash('VoiceDesk2024!', 12);
    await client.query(`
      INSERT INTO users (email, password_hash, full_name, department, employee_id)
      VALUES
        ('alex.chen@ucla.edu', $1, 'Alex Chen', 'Information Technology', 'EMP001'),
        ('sarah.kim@ucla.edu', $1, 'Sarah Kim', 'Academic Affairs', 'EMP002'),
        ('demo@ucla.edu', $1, 'Demo User', 'Campus Operations', 'EMP999')
      ON CONFLICT (email) DO NOTHING
    `, [passwordHash]);

    // Conference rooms
    await client.query(`
      INSERT INTO rooms (name, building, room_number, capacity, features, floor, twentyfive_live_id)
      VALUES
        ('Bruin Conference Room A', 'Murphy Hall', '1100', 12, ARRAY['projector', 'whiteboard', 'video_conferencing'], 1, '25L-MH-1100'),
        ('Tech Hub Meeting Room', 'Boelter Hall', '3400', 8, ARRAY['dual_monitors', 'whiteboard'], 3, '25L-BH-3400'),
        ('Faculty Lounge', 'Royce Hall', '150', 20, ARRAY['projector', 'catering_available', 'stage'], 1, '25L-RH-150'),
        ('Innovation Lab', 'Engineering VI', '480', 6, ARRAY['smartboard', 'standing_desks'], 4, '25L-E6-480'),
        ('Executive Boardroom', 'Ackerman Union', '3517', 16, ARRAY['video_conferencing', 'projector', 'catering_available'], 3, '25L-AU-3517'),
        ('Study Pod 1', 'Powell Library', 'SP-01', 4, ARRAY['whiteboard', 'monitor'], 2, '25L-PL-SP01')
      ON CONFLICT DO NOTHING
    `);

    // Demo leave requests
    const alexResult = await client.query(`SELECT id FROM users WHERE email = 'alex.chen@ucla.edu'`);
    const alexId = alexResult.rows[0]?.id;
    if (alexId) {
      await client.query(`
        INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, reason, status, workday_reference)
        VALUES
          ($1, 'vacation', CURRENT_DATE + 14, CURRENT_DATE + 18, 'Family vacation', 'approved', 'WD-2024-0892'),
          ($1, 'sick', CURRENT_DATE - 7, CURRENT_DATE - 6, 'Flu recovery', 'approved', 'WD-2024-0841'),
          ($1, 'personal', CURRENT_DATE + 30, CURRENT_DATE + 30, 'DMV appointment', 'pending', 'WD-2024-0901')
        ON CONFLICT DO NOTHING
      `, [alexId]);

      await client.query(`
        INSERT INTO it_tickets (user_id, title, description, category, priority, status, servicenow_number)
        VALUES
          ($1, 'WiFi disconnects every 30 minutes', 'My laptop keeps disconnecting from BruinNet. Happens across multiple locations on campus.', 'network', 'high', 'in_progress', 'INC0042891'),
          ($1, 'VPN not working from home', 'GlobalProtect VPN fails to connect with error code 10006.', 'network', 'medium', 'open', 'INC0043102'),
          ($1, 'Outlook calendar not syncing', 'Calendar events from Teams meetings do not appear in Outlook.', 'email', 'low', 'resolved', 'INC0041760')
        ON CONFLICT DO NOTHING
      `, [alexId]);
    }

    console.log('✅ Seed complete');
    console.log('Demo credentials:');
    console.log('  Email: demo@ucla.edu');
    console.log('  Password: VoiceDesk2024!');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
