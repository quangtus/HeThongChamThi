import React from 'react';

const ExamInfoForm = ({ examData, setExamData, loadingSubjects }) => {
  return (
    <div className="tw-form space-y-5">
      <div className="tw-form-group">
        <label className="tw-label">Tên đề thi</label>
        <input
          value={examData.title}
          onChange={(e) => setExamData({ ...examData, title: e.target.value })}
          className="tw-input"
          placeholder="Nhập tiêu đề..."
        />
      </div>

      <div className="tw-form-grid">
        <div className="tw-form-group">
          <label className="tw-label">Môn thi</label>
          <select
            value={examData.subject.subject_id}
            onChange={(e) => setExamData({
              ...examData,
              subject: {
                subject_id: e.target.value,
                subject_name: examData.subjectList.find(s => s.subject_id == e.target.value)?.subject_name || ''
              }
            })}
            className="tw-input"
            disabled={loadingSubjects}
          >
            <option value="">-- Chọn môn --</option>
            {examData.subjectList.map(s => (
              <option key={s.subject_id} value={s.subject_id}>
                {s.subject_name}
              </option>
            ))}
          </select>
          {loadingSubjects && (
            <p className="text-xs text-slate-500 mt-1">Đang tải danh sách môn...</p>
          )}
        </div>
        <div className="tw-form-group">
          <label className="tw-label">Thời gian (phút)</label>
          <input
            type="number"
            value={examData.duration}
            onChange={(e) => setExamData({ ...examData, duration: Number(e.target.value) })}
            className="tw-input"
          />
        </div>
        <div className="tw-form-group">
          <label className="tw-label">Mã đề</label>
          <input
            value={examData.id}
            onChange={(e) => setExamData({ ...examData, id: e.target.value })}
            className="tw-input"
          />
        </div>
        <div className="tw-form-group">
          <label className="tw-label">Số câu hỏi</label>
          <input
            type="number"
            min={0}
            value={examData.totalQuestions ?? examData.questions?.length ?? 0}
            onChange={(e) => setExamData({ ...examData, totalQuestions: Number(e.target.value) })}
            className="tw-input"
          />
        </div>
        <div className="tw-form-group">
          <label className="tw-label">Tổng điểm</label>
          <input
            type="number"
            min={0}
            step="0.25"
            value={examData.totalScore ?? 0}
            onChange={(e) => setExamData({ ...examData, totalScore: Number(e.target.value) })}
            className="tw-input"
          />
        </div>
      </div>

      <div className="tw-form-group">
        <label className="tw-label">Mô tả</label>
        <textarea
          value={examData.description}
          onChange={(e) => setExamData({ ...examData, description: e.target.value })}
          rows={3}
          className="tw-textarea"
        />
      </div>

    </div>
  );
};

export default ExamInfoForm;

