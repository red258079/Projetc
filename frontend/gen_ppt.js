const pptxgen = require("pptxgenjs");

let pres = new pptxgen();

// Theme colors
const blue = "2A4B7C";
const lightBlue = "D4E1F9";
const dark = "1A1A1A";

pres.layout = "LAYOUT_16x9";

// Slide 1: Title
let slide1 = pres.addSlide();
slide1.background = { fill: blue };
slide1.addText("BÁO CÁO CÔNG VIỆC DỰ ÁN", {
    x: "10%", y: "40%", w: "80%", h: 2,
    fontSize: 48, bold: true, color: "FFFFFF", align: "center", fontFace: "Arial"
});
slide1.addText("Sinh viên thực hiện: Bùi Đức Thuần", {
    x: "10%", y: "60%", w: "80%", h: 1,
    fontSize: 28, color: "F1F1F1", align: "center", fontFace: "Arial"
});

// Slide 2: Tổng quan
let slide2 = pres.addSlide();
slide2.addText("1. TỔNG QUAN PHÂN CÔNG", {
    x: "5%", y: "5%", w: "90%", h: 1,
    fontSize: 32, bold: true, color: blue, fontFace: "Arial", border: [0,0,{pt: 2, color: blue},0]
});
slide2.addText([
    { text: "Vai trò trong nhóm:", options: { bold: true } },
    { text: " Lập trình viên Backend", options: { breakLine: true } },
    { text: "Focus chính:", options: { bold: true } },
    { text: " Xây dựng cốt lõi API cho ứng dụng Quản lý dự án", options: { breakLine: true } }
], {
    x: "10%", y: "25%", w: "80%", h: 3,
    fontSize: 24, color: dark, bullet: true, lineSpacing: 40
});

// Slide 3: Task 1
let slide3 = pres.addSlide();
slide3.addText("2. NHIỆM VỤ 1: XÂY DỰNG API CƠ BẢN", {
    x: "5%", y: "5%", w: "90%", h: 1,
    fontSize: 32, bold: true, color: blue, fontFace: "Arial", border: [0,0,{pt: 2, color: blue},0]
});
slide3.addText([
    { text: "Code các API cơ bản cho hệ thống", options: { bold: true } },
    { text: "Xây dựng luồng Đăng nhập (Login)", options: { breakLine: true, indentLevel: 1 } },
    { text: "Tích hợp chuẩn xác thực Auth JWT", options: { breakLine: true, indentLevel: 1 } },
    { text: "Phân quyền và quản lý phiên (Session/Token) của User", options: { breakLine: true, indentLevel: 1 } }
], {
    x: "10%", y: "25%", w: "80%", h: 3,
    fontSize: 24, color: dark, bullet: true, lineSpacing: 40
});
slide3.addShape(pres.ShapeType.rect, { x: "70%", y: "30%", w: "20%", h: "20%", fill: "F3F4F6", line: blue });
slide3.addText("JWT AUTH", { x: "70%", y: "30%", w: "20%", h: "20%", align: "center", bold: true, color: blue });

// Slide 4: Task 2
let slide4 = pres.addSlide();
slide4.addText("3. NHIỆM VỤ 2: CODE API CHỨC NĂNG", {
    x: "5%", y: "5%", w: "90%", h: 1,
    fontSize: 32, bold: true, color: blue, fontFace: "Arial", border: [0,0,{pt: 2, color: blue},0]
});
slide4.addText([
    { text: "Code API chức năng nghiệp vụ (CRUD)", options: { bold: true } },
    { text: "Thao tác trực tiếp với Database (Thêm, Sửa, Xoá)", options: { breakLine: true, indentLevel: 1 } },
    { text: "Áp dụng cho Quản lý Dự án, Công việc, Thống kê...", options: { breakLine: true, indentLevel: 1 } },
    { text: "Đảm bảo tính toàn vẹn dữ liệu từ Front-end gửi về", options: { breakLine: true, indentLevel: 1 } }
], {
    x: "10%", y: "25%", w: "80%", h: 3,
    fontSize: 24, color: dark, bullet: true, lineSpacing: 40
});
slide4.addShape(pres.ShapeType.rect, { x: "70%", y: "30%", w: "20%", h: "20%", fill: "F3F4F6", line: blue });
slide4.addText("CRUD OP", { x: "70%", y: "30%", w: "20%", h: "20%", align: "center", bold: true, color: blue });

// Slide 5: Tổng kết
let slide5 = pres.addSlide();
slide5.background = { fill: lightBlue };
slide5.addText("KẾT QUẢ ĐẠT ĐƯỢC", {
    x: "5%", y: "15%", w: "90%", h: 1,
    fontSize: 36, bold: true, color: blue, align: "center", fontFace: "Arial"
});
slide5.addText("Hoàn thiện hệ thống Backend đủ đáp ứng cho việc ghép nối với giao diện.\nXác thực chặt chẽ, tối ưu được tốc độ tải trang.", {
    x: "10%", y: "35%", w: "80%", h: 2,
    fontSize: 24, color: dark, align: "center", lineSpacing: 40
});

pres.writeFile({ fileName: "Bao_Cao_Bui_Duc_Thuan.pptx" }).then(fileName => {
    console.log("Đã tạo xong file: " + fileName);
});
