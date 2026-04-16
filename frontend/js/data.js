// ============================================================
// DATA LAYER - Wrapper gọi REST API (thay thế localStorage)
// Tất cả dữ liệu được lưu trong MySQL qua backend
// ============================================================

// Các module tasks.js, estimation.js, cost.js, schedule.js
// đều gọi trực tiếp API.get/post/put/delete
// File này chỉ giữ lại để tương thích nếu cần
const DB_LEGACY = {
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
};
