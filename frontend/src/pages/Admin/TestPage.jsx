import React from 'react';

const TestPage = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>✅ Test Page Works!</h1>
      <p>Nếu bạn thấy trang này, routing đang hoạt động tốt.</p>
      <ul>
        <li>Backend: <a href="http://localhost:5000" target="_blank">http://localhost:5000</a></li>
        <li>Frontend: <a href="http://localhost:3000" target="_blank">http://localhost:3000</a></li>
      </ul>
    </div>
  );
};

export default TestPage;
