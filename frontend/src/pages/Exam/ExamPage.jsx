import React from 'react';
import { useParams } from 'react-router-dom';

const ExamPage = () => {
  const { examId } = useParams();

  return (
    <div className="container">
      <h1>📝 Làm bài thi</h1>
      <p>Đề thi ID: {examId}</p>
      <p>Chức năng này đang được phát triển...</p>
    </div>
  );
};

export default ExamPage;
