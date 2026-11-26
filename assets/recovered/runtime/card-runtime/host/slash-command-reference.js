// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createSlashCommandReference(dependencies = {}) {
var of=[{cmd:"/help",desc:"Xem danh sách lệnh hỗ trợ"},{cmd:"/bg",desc:'Đổi hình nền (URL hoặc "off")',example:"/bg https://..."},{cmd:"/music",desc:'Phát nhạc nền (URL hoặc "off")',example:"/music https://..."},{cmd:"/sound",desc:"Phát âm thanh FX (URL)",example:"/sound https://..."},{cmd:"/sys",desc:"Gửi tin nhắn hệ thống (ẩn danh)",example:"/sys Trời bắt đầu mưa..."},{cmd:"/echo",desc:"Hiển thị thông báo (Toast)",example:"/echo Đã lưu game!"},{cmd:"/set",desc:"Đặt biến số (Variable)",example:"/set hp=100"},{cmd:"/get",desc:"Xem giá trị biến số",example:"/get hp"},{cmd:"/input",desc:"Đặt nội dung khung chat",example:"/input Xin chào"},{cmd:"/lock",desc:"Khóa khung chat"},{cmd:"/unlock",desc:"Mở khóa khung chat"}];
return { commands: of };
}
