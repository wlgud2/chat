const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// IP별 사용자 관리를 위한 Map
const connectedIPs = new Map(); // IP -> {nickname: string}

// 전체 유니크 접속자 수
let uniqueUsers = 0;

// 랜덤 닉네임 생성 함수
function generateNickname() {
    const adjectives = ['행복한', '즐거운', '신나는', '귀여운', '멋진', '착한', '웃는', '똑똑한'];
    const nouns = ['고양이', '강아지', '토끼', '다람쥐', '판다', '코알라', '펭귄', '기린'];
    const randomNum = Math.floor(Math.random() * 1000);
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${
        nouns[Math.floor(Math.random() * nouns.length)]}${randomNum}`;
}

io.on('connection', (socket) => {
    const clientIP = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    let nickname;
    
    // IP별 첫 접속 처리
    if (!connectedIPs.has(clientIP)) {
        nickname = generateNickname();
        connectedIPs.set(clientIP, { nickname });
        uniqueUsers++;
        io.emit('userCount', uniqueUsers);
    } else {
        // 같은 IP의 추가 접속 - 기존 닉네임 사용
        nickname = connectedIPs.get(clientIP).nickname;
    }
    
    // 클라이언트에게 닉네임 전송
    socket.emit('set nickname', nickname);
    
    socket.on('chat message', (msg) => {
        const timestamp = new Date().toLocaleTimeString('ko-KR');
        io.emit('chat message', {
            nickname: nickname,
            message: msg,
            timestamp: timestamp
        });
    });
    
    socket.on('disconnect', () => {
        // 모든 소켓 연결을 확인하여 해당 IP의 다른 연결이 있는지 확인
        const connectedSockets = Array.from(io.sockets.sockets.values());
        const sameIPConnections = connectedSockets.filter(s => 
            (s.handshake.headers['x-forwarded-for'] || s.handshake.address) === clientIP
        );
        
        // 해당 IP의 마지막 연결이 끊어질 때만 처리
        if (sameIPConnections.length === 0) {
            connectedIPs.delete(clientIP);
            uniqueUsers--;
            io.emit('userCount', uniqueUsers);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});