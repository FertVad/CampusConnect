import React from 'react';
// Импортируем уже готовый компонент
import NewAdminDashboard from './NewAdminDashboard';

// Переадресуем на новый компонент с обновленным дизайном
const AdminDashboard = () => {
  return <NewAdminDashboard />;
}

export default AdminDashboard;