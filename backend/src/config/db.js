const { Pool } = require('pg');
require('dotenv').config();

// Kết nối PostgreSQL (Supabase) qua pool
const createPool = () => {
    const config = {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
        database: process.env.PGDATABASE || 'postgres',
        ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
        // Thêm cấu hình cho Supabase
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 20
    };
    
    console.log('🔧 Database config:', {
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database,
        ssl: config.ssl ? 'enabled' : 'disabled'
    });
    
    const pool = new Pool(config);
    return pool;
};

let pool;

const getPool = () => {
    if (!pool) pool = createPool();
    return pool;
};

const closePool = async() => {
    if (pool) {
        try {
            await pool.end();
        } catch (e) {
            // ignore
        } finally {
            pool = undefined;
        }
    }
};

const testConnection = async(retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`🔄 Attempting database connection (${i + 1}/${retries})...`);
            const res = await getPool().query('SELECT 1 AS ok');
            const ok = res.rows[0] ? res.rows[0].ok : null;
            console.log(`✅ PostgreSQL Connected: ok=${ok}`);
            return true;
        } catch (error) {
            console.error(`❌ PostgreSQL connection error (attempt ${i + 1}):`, error.message);
            if (i === retries - 1) {
                console.error('❌ All connection attempts failed');
                return false;
            }
            console.log('⏳ Retrying in 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    return false;
};

// Chuyển named params kiểu :name thành $1, $2 ...
function buildPgQuery(sql, params) {
    if (!params) return { text: sql, values: [] };

    // Array params với dấu ?
    if (Array.isArray(params)) {
        let index = 0;
        const text = sql.replace(/\?/g, () => `$${++index}`);
        return { text, values: params };
    }

    // Object params với placeholder :name (bỏ qua ::json, ::jsonb)
    const values = [];
    const nameToIndex = {};
    let i = 0;
    const text = sql.replace(/(^|[^:]):([a-zA-Z0-9_]+)/g, (match, prefix, name) => {
        if (!(name in params)) throw new Error(`Thiếu tham số: ${name}`);
        if (!(name in nameToIndex)) {
            values.push(params[name]);
            nameToIndex[name] = ++i;
        }
        return `${prefix}$${nameToIndex[name]}`;
    });
    return { text, values };
}

// Query helper: trả về kết quả Postgres thuần túy
const query = async(sql, params) => {
    const pool = getPool();
    try {
        const built = buildPgQuery(sql, params);
        const res = await pool.query(built);
        // Trả về rows trực tiếp cho SELECT, hoặc cả res để lấy rowCount/rows khi cần
        return res.rows;
    } catch (error) {
        console.error('❌ Lỗi truy vấn PostgreSQL:', error.message);
        console.error('📊 Error details:', {
            code: error.code,
            errno: error.errno,
            syscall: error.syscall,
            hostname: error.hostname
        });
        throw error;
    }
};

module.exports = {
    getPool,
    testConnection,
    query,
    closePool
};