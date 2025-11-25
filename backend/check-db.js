require('dotenv').config();
const { query, testConnection } = require('./src/config/db');

async function checkDB() {
    console.log('🔄 Testing database connection...');

    const ok = await testConnection();
    if (!ok) {
        console.log('❌ Connection failed!');
        process.exit(1);
    }

    console.log('✅ Connected to Supabase!');

    // Check tables
    const tables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('\n📋 Tables in database:', tables.length);
    if (tables.length > 0) {
        tables.forEach(t => console.log('  -', t.table_name));
    } else {
        console.log('  (No tables found - need to run DB_v2.sql)');
    }

    // Check if users table exists and has data
    try {
        const users = await query('SELECT user_id, username, role_id FROM users LIMIT 5');
        console.log('\n👥 Users:', users.length);
        users.forEach(u => console.log('  -', u.username, '(role_id:', u.role_id + ')'));
    } catch (e) {
        console.log('\n⚠️  Users table not found or empty');
    }

    process.exit(0);
}

checkDB().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});