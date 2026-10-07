import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth';
import { Empty, Layout, Protected } from './components';
import { CourseDetail, Home, Login, Setup } from './pages/Public';
import { Learning, MyLearning, OrderDetail } from './pages/Student';
import { PublicPage, SupportWidget } from './Support';
import { Admin } from './pages/Admin';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/vietnamese-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/barlow-condensed/vietnamese-700.css';
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/latin-500.css';
import '@fontsource/be-vietnam-pro/vietnamese-500.css';
import '@fontsource/be-vietnam-pro/latin-600.css';
import '@fontsource/be-vietnam-pro/vietnamese-600.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import './styles.css';
import './dark.css';
import './cinematic.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SupportWidget />
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/courses" element={<Home catalog />} />
            <Route path="/courses/:slug" element={<CourseDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<Login />} />
            <Route path="/pages/:slug" element={<PublicPage />} />
            <Route path="/setup" element={<Setup />} />
            <Route
              path="/my-learning"
              element={
                <Protected>
                  <MyLearning />
                </Protected>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <Protected>
                  <OrderDetail />
                </Protected>
              }
            />
            <Route
              path="/learn/:courseId/:lessonId?"
              element={
                <Protected>
                  <Learning />
                </Protected>
              }
            />
            <Route
              path="/admin/*"
              element={
                <Protected admin>
                  <Admin />
                </Protected>
              }
            />
            <Route
              path="*"
              element={
                <Empty title="Trang này không tồn tại">
                  <a href="/">Về trang chủ</a>
                </Empty>
              }
            />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
