import React from 'react';

const ScoreMismatchModal = ({
  open,
  onClose,
  totalScore = 0,
  questionSum = 0,
  questionCount = 0,
  onDistribute,
  onAlignTotal,
  distributeLabel = 'Chia đều tổng điểm cho các câu và lưu',
  alignLabel = null,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
        <h3 className="font-semibold text-lg text-slate-800 mb-2">Chênh lệch tổng điểm</h3>
        <p className="text-sm text-slate-600 mb-4">
          Tổng điểm đề thi đang là <strong>{Number(totalScore)}</strong> nhưng tổng điểm các câu hiện là <strong>{Number(questionSum)}</strong> cho {questionCount} câu hỏi.
        </p>
        <p className="text-sm text-slate-600 mb-4">
          Bạn muốn xử lý chênh lệch như thế nào?
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="tw-btn tw-btn-primary"
            onClick={onDistribute}
          >
            {distributeLabel || `Chia đều tổng điểm cho ${questionCount} câu và lưu`}
          </button>
          {onAlignTotal && (
            <button
              type="button"
              className="tw-btn tw-btn-secondary"
              onClick={onAlignTotal}
            >
              {alignLabel || `Cập nhật tổng điểm đề = ${Number(questionSum)} và lưu`}
            </button>
          )}
          <button type="button" className="tw-btn" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
};

export default ScoreMismatchModal;
