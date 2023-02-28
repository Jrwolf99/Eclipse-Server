const WebSocket = require("ws");
const express = require("express");
const { randomUUID } = require("crypto");

const app = express();
const wss = new WebSocket.Server({
  noServer: true,
});

playerList = {};
let gameStarted = false;

// 1) receive the messages from a client -------------------------------------------

wss.on("connection", (ws) => {
  console.log("new client connection!");
  let currUid = randomUUID();

  handleOnConnection(currUid, ws);

  ws.on("message", (data) => {
    data = JSON.parse(data);
    let msg2send = {};

    switch (data.type) {
      case "name c2s":
        msg2send = handleNameTransmission(currUid, data);
        broadcastSend(msg2send);

        break;

      case "gamestart c2s":
        msg2send = handleGameStart(data);
        gameStarted = true;
        broadcastSend(msg2send);
        break;

      case "gameend c2s":
        msg2send = handleGameEnd(data);
        gameStarted = false;
        broadcastSend(msg2send);
        break;

      case "gamestate c2s":
        msg2send = handleGameStateChange(currUid, data);
        gameStarted && broadcastButMeSend(msg2send, ws);
        break;

      case "bulletshoot c2s":
        msg2send = handleBulletShoot(data);
        gameStarted && broadcastButMeSend(msg2send, ws);
        break;

      case "deletebullet c2s":
        msg2send = handleBulletDelete(data);
        gameStarted && broadcastButMeSend(msg2send, ws);
        break;

      case "obstaclehit c2s":
        msg2send = handleObstacleHit(data);
        gameStarted && broadcastButMeSend(msg2send, ws);
        break;

      case "updatescore c2s":
        msg2send = handleScoreUpdate(data);
        gameStarted && broadcastButMeSend(msg2send, ws);
        break;

      default:
        break;
    }
  });

  ws.on("close", () => {
    gameStarted = false;
    playerList = {};
  });
});

// 2) manage and package the data to be sent to all clients----------------------------------------------

const handleOnConnection = (currUid, ws) => {
  playerList[currUid] = {
    name: "blank",
    gameStateData: {
      keyspressedarray: [],
      coordsarray: [],
      bulletcoordslist: {},
    },
  };

  let msg = {
    type: "register UID",
    currUid: currUid,
  };
  msg = JSON.stringify(msg);
  ws.send(msg);
};

const handleNameTransmission = (currUid, data) => {
  playerList[currUid] = { ...playerList[currUid], name: data.name };
  return {
    type: "name s2c",
    playerList: playerList,
  };
};

const handleGameStart = (data) => {
  console.log("game started!", data);

  let obstacleData = [Math.random(), Math.random()];

  return {
    type: "gamestart s2c",
    playerCount: data.playerCount,
    playerList: playerList,
    obstacleData: obstacleData,
  };
};

const handleGameEnd = (data) => {
  console.log("game ended!");
  return {
    type: "gameend s2c",
    scores: data.scores,
  };
};

const handleGameStateChange = (currUid, data) => {
  playerList[currUid] = {
    ...playerList[currUid],
    gameStateData: data.gameStateData,
  };

  return {
    type: "gamestate s2c",
    playerList: playerList,
  };
};

const handleBulletShoot = (data) => {
  return {
    type: "bulletshoot s2c",
    bulletUID: data.bulletUID,
  };
};
const handleBulletDelete = (data) => {
  return {
    type: "deletebullet s2c",
    bulletUID: data.bulletUID,
  };
};

const handleObstacleHit = (data) => {
  return {
    type: "obstaclehit s2c",
    nextXYCoords: data.nextXYCoords,
  };
};

const handleScoreUpdate = (data) => {
  return {
    type: "updatescore s2c",
    score: data.score,
    shipUID: data.shipUID,
  };
};

// 3) send the msg to all clients ----------------------------------------------------

const broadcastSend = (msg) => {
  msg = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
};
const broadcastButMeSend = (msg, ws) => {
  msg = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
};

const server = app.listen(process.env.PORT || 3000);
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (socket) => {
    wss.emit("connection", socket, request);
  });
});
