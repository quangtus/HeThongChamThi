const UserRepo = require('../models/User');

const seedUsers = async () => {
  try {
    // await UserRepo.ensureUsersTable(); // Đã được gọi tự động trong model

    const existing = await UserRepo.count();
    if (existing > 0) {
      console.log('Users đã tồn tại, bỏ qua seeding...');
      return;
    }

    const sampleUsers = [
      {
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123',
        fullName: 'Quản trị viên hệ thống',
        role: 'admin',
        status: 'active',
        phone: '0123456789',
        address: 'Hà Nội, Việt Nam'
      },
      {
        username: 'examiner1',
        email: 'examiner1@example.com',
        password: 'examiner123',
        fullName: 'Nguyễn Văn A',
        role: 'examiner',
        status: 'active',
        phone: '0987654321',
        address: 'TP.HCM, Việt Nam'
      },
      {
        username: 'examiner2',
        email: 'examiner2@example.com',
        password: 'examiner123',
        fullName: 'Trần Thị B',
        role: 'examiner',
        status: 'active',
        phone: '0912345678',
        address: 'Đà Nẵng, Việt Nam'
      },
      {
        username: 'candidate1',
        email: 'candidate1@example.com',
        password: 'candidate123',
        fullName: 'Lê Văn C',
        role: 'candidate',
        status: 'active',
        phone: '0934567890',
        address: 'Cần Thơ, Việt Nam'
      },
      {
        username: 'candidate2',
        email: 'candidate2@example.com',
        password: 'candidate123',
        fullName: 'Phạm Thị D',
        role: 'candidate',
        status: 'active',
        phone: '0945678901',
        address: 'Hải Phòng, Việt Nam'
      },
      {
        username: 'candidate3',
        email: 'candidate3@example.com',
        password: 'candidate123',
        fullName: 'Hoàng Văn E',
        role: 'candidate',
        status: 'inactive',
        phone: '0956789012',
        address: 'Nha Trang, Việt Nam'
      }
    ];

    for (const userData of sampleUsers) {
      const user = await UserRepo.insert(userData);
      console.log(`✅ Đã tạo user: ${user.username} (${user.role})`);
    }

    console.log('🎉 Seeding users hoàn thành!');
  } catch (error) {
    console.error('❌ Lỗi khi seeding users:', error);
  }
};

module.exports = seedUsers;
