require('dotenv').config();
const { testConnection } = require('../config/db');
const { ensureUsersTable } = require('../models/User');
const seedUsers = require('./userSeeder');
const { seedAuthData } = require('./authSeeder');

const runSeeders = async () => {
  try {
    console.log('🌱 Bắt đầu seeding dữ liệu...');

    await testConnection();
    // await ensureUsersTable(); // Đã được gọi tự động trong model
    console.log('✅ Đã kết nối database và đảm bảo bảng users');

    // Chạy auth seeder trước (tạo roles và users)
    await seedAuthData();
    
    // Chạy user seeder (nếu cần thêm users khác)
    await seedUsers();

    console.log('🎉 Tất cả seeders đã hoàn thành!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi chạy seeders:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  require('dotenv').config();
  runSeeders();
}

module.exports = runSeeders;
