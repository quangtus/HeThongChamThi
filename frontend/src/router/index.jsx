import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import Login from '../pages/Auth/Login';
import Dashboard from '../pages/Dashboard/Dashboard';
import UsersPage from '../pages/Admin/UsersPage';
import ExaminersPage from '../pages/Admin/ExaminersPage';
import CandidatesPage from '../pages/Admin/CandidatesPage';
import SubjectsPage from '../pages/Admin/SubjectsPage';
import ExamEssaysPage from '../pages/Admin/ExamEssaysPage';
import ExamPage from '../pages/Exam/ExamPage';
import ResultsPage from '../pages/Results/ResultsPage';
import ProfilePage from '../pages/Profile/ProfilePage';
import NotFoundPage from '../pages/Error/NotFoundPage';
import ProtectedRoute from '../components/ProtectedRoute';

import CreateExamMCQPage from "../pages/Admin/CreateExamMCQPage";
import ExamMCQListPage from "../pages/Admin/ExamMCQListPage";
import FillAnswerPDF from "../pages/Admin/FillAnswerPDF";
import ExamMCQDetailPage from "../pages/Admin/ExamMCQDetailPage";
import ExamMCQEditPage from "../pages/Admin/ExamMCQEditPage";
import EditAnswerPDF from "../pages/Admin/EditAnswerPDF";

// Grading and Statistics Pages
import GradingAssignmentsPage from "../pages/Admin/GradingAssignmentsPage";
import GradingComparisonPage from "../pages/Admin/GradingComparisonPage";
import StatisticsPage from "../pages/Admin/StatisticsPage";
import GradingPage from "../pages/Examiner/GradingPage";

const router = createBrowserRouter([
  // ============================================
  // PUBLIC ROUTES (Không cần đăng nhập)
  // ============================================
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },

  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/auth/login",
    element: <Login />,
  },

  // ============================================
  // PROTECTED ROUTES (Cần đăng nhập)
  // ============================================
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      // Profile
      {
        path: "profile",
        element: <ProfilePage />,
      },
      // Exam Routes (cho thí sinh)
      {
        path: "exam/take/:examId",
        element: <ExamPage />,
      },
      {
        path: "exam/results",
        element: <ResultsPage />,
      },
    ],
  },

  // ============================================
  // ADMIN ROUTES (Quản lý hệ thống)
  // ============================================
  {
    path: "/admin/users",
    element: (
      <ProtectedRoute requiredRole="admin">
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <UsersPage />,
      },
    ],
  },
  {
    path: "/admin/examiners",
    element: (
      <ProtectedRoute requiredRole="admin">
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <ExaminersPage />,
      },
    ],
  },
  {
    path: "/admin/candidates",
    element: (
      <ProtectedRoute requiredRole="admin">
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <CandidatesPage />,
      },
    ],
  },
  {
    path: "/admin/subjects",
    element: (
      <ProtectedRoute requiredRole="admin">
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <SubjectsPage />,
      },
    ],
  },
  {
    path: "/admin/exam-essays",
    element: (
      <ProtectedRoute requiredRole="admin">
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <ExamEssaysPage />,
      },
    ],
  },
    {
    path: "/admin/create-exam-mcq",
    element: (
      <ProtectedRoute requiredRole="admin">
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <CreateExamMCQPage />,
      },
    ],
  },
  {
    path: "/admin/exam-mcq",
    element: (
      <ProtectedRoute requiredRole="admin">
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <ExamMCQListPage />,
      },
    ],
  },
  {
    path: "/admin/exam-mcq/:id",
    element: (
      <ProtectedRoute requiredRole="admin">
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <ExamMCQDetailPage />,
      },
    ],
  },
  {
    path: "/admin/exam-mcq/:id/edit",
    element: (
      <ProtectedRoute requiredRole="admin">
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <ExamMCQEditPage />,
      },
    ],
  },
  {
    path: "/admin/FillAnswerPDF",
    element: (
      <ProtectedRoute requiredRole="admin">
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <FillAnswerPDF />,
      },
    ],
  },
  {
    path: "/admin/exam-mcq/:id/pdfedit",
    element: (
      <ProtectedRoute requiredRole="admin">
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <EditAnswerPDF />,
      },
    ],
  },
  // ============================================
  // GRADING & STATISTICS ROUTES (Admin)
  // ============================================
  {
    path: "/admin/grading/assignments",
    element: (
      <ProtectedRoute requiredRole="admin">
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <GradingAssignmentsPage />,
      },
    ],
  },
  {
    path: "/admin/grading/comparison",
    element: (
      <ProtectedRoute requiredRole="admin">
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <GradingComparisonPage />,
      },
    ],
  },
  {
    path: "/admin/statistics",
    element: (
      <ProtectedRoute requiredRole="admin">
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <StatisticsPage />,
      },
    ],
  },
  // ============================================
  // EXAMINER ROUTES (Cán bộ chấm thi)
  // ============================================
  {
    path: "/examiner/grading",
    element: (
      <ProtectedRoute requiredRole="examiner">
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <GradingPage />,
      },
      {
        path: ":assignmentId",
        element: <GradingPage />,
      },
    ],
  },

  // ============================================
  // 404 NOT FOUND
  // ============================================

  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export default router;
