const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// IP별 사용자 관리를 위한 Map
const connectedIPs = new Map(); // IP -> {nickname: string, count: number}

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
    
    // IP별 첫 접속 처리
    if (!connectedIPs.has(clientIP)) {
        connectedIPs.set(clientIP, {
            nickname: generateNickname(),
            count: 1
        });
        io.emit('userCount', connectedIPs.size);
    } else {
        // 같은 IP의 추가 접속
        const userData = connectedIPs.get(clientIP);
        userData.count++;
        connectedIPs.set(clientIP, userData);
    }
    
    // 클라이언트에게 닉네임 전송
    socket.emit('set nickname', connectedIPs.get(clientIP).nickname);
    
    socket.on('chat message', (msg) => {
        const userData = connectedIPs.get(clientIP);
        const timestamp = new Date().toLocaleTimeString('ko-KR');
        io.emit('chat message', {
            nickname: userData.nickname,
            message: msg,
            timestamp: timestamp
        });
    });
    
    socket.on('disconnect', () => {
        if (connectedIPs.has(clientIP)) {
            const userData = connectedIPs.get(clientIP);
            userData.count--;
            if (userData.count <= 0) {
                connectedIPs.delete(clientIP);
                io.emit('userCount', connectedIPs.size);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});