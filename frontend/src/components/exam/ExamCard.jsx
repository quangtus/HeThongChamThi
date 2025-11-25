import React from 'react';

const ExamCard = ({ exam, onEdit, onPreview, onDelete }) => {
  const id = exam?.id ?? exam?.mcq_id ?? exam?.exam_code;
  const code = exam?.id ?? exam?.exam_code ?? exam?.mcq_id ?? '-';
  const title = exam?.title ?? exam?.exam_title ?? '-';
  const subjectLabel = (exam?.subject && (exam.subject.subject_name || exam.subject.name))
    ?? exam?.subject_name
    ?? exam?.subject?.subject_id
    ?? exam?.subject_id
    ?? '-';
  const duration = exam?.duration ?? '-';
  const questionCount = exam?.questionCount ?? exam?.total_questions ?? exam?.questions?.length ?? 0;
  const totalScore = exam?.totalScore ?? exam?.total_score ?? '';
  const hasPdf = Boolean(exam?.linkPdf || exam?.link_pdf);
  const createdAt = exam?.createdDate ?? exam?.created_at ?? '-';

  return (
    <div className="relative rounded-xl border bg-white shadow-sm hover:shadow-md transition overflow-hidden">
      {hasPdf && (
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full shadow-sm">
          PDF
        </div>
      )}
      <div className="p-4 pt-6">
        <div className="text-xs text-slate-500">Mã đề</div>
        <div className="font-mono text-sm">{code}</div>
        <h3 className="mt-2 font-semibold text-slate-800 line-clamp-2">{title}</h3>
        <div className="mt-2 text-sm text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
          <span>• {subjectLabel}</span>
          <span>• {duration} phút</span>
          <span>• {questionCount} câu</span>
          {totalScore !== '' && <span>• {totalScore} điểm</span>}
        </div>
        <div className="mt-2 text-xs text-slate-400">{createdAt}</div>
      </div>
      <div className="p-3 border-t bg-slate-50 flex justify-end gap-2">
        <button 
          className="tw-btn tw-btn-secondary" 
          onClick={() => onEdit?.(id, hasPdf)}
        >
          Sửa
        </button>
        <button className="tw-btn tw-btn-secondary" onClick={() => onPreview?.(id)}>Chi tiết</button>
        <button className="tw-btn bg-red-600 text-white hover:bg-red-700" onClick={() => onDelete?.(exam?.mcq_id ?? id)}>Xóa</button>
      </div>
    </div>
  );
};

export default ExamCard;
